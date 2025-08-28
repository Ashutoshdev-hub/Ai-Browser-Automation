// src/auth.ts
import type { Page, Frame, Locator, ElementHandle } from "playwright";
import { typeHuman } from "./utils/human.js";

type Creds = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
};

type Root = Page | Frame | Locator;

const RX = {
  email: /email|e-mail|mail/i,
  password: /password|passcode/i,
  confirmPassword:
    /confirm(?:\s*password)?|re-?type\s*password|re-?enter\s*password|repeat\s*password/i,
  firstName: /first\s*name|given/i,
  lastName: /last\s*name|surname|family/i,
};

function textSelector(rx: RegExp): string {
  const body = rx.source;
  const flags = rx.flags.includes("i") ? "i" : "";
  return `text=/${body}/${flags}`;
}

function typeFor(kind: keyof typeof RX) {
  if (kind === "password" || kind === "confirmPassword") return "password";
  if (kind === "email") return "email";
  return "text";
}

async function roots(page: Page): Promise<Root[]> {
  return [page, ...page.frames()];
}

async function firstPresent(
  cands: (Locator | null | undefined)[]
): Promise<Locator | null> {
  for (const c of cands) {
    if (!c) continue;
    try {
      if ((await c.count()) > 0) return c.first();
    } catch {}
  }
  return null;
}

async function queryByLabelOrPlaceholder(root: Root, kind: keyof typeof RX) {
  const rx = RX[kind];
  const byLabel = (root as any).getByLabel?.(rx);
  const byPlaceholder = (root as any).getByPlaceholder?.(rx);
  return await firstPresent([byLabel, byPlaceholder]);
}

async function queryByTypeNameId(root: Root, kind: keyof typeof RX) {
  const t = typeFor(kind);
  const extra =
    kind === "confirmPassword"
      ? `, input[name*="confirm" i], input[id*="confirm" i], input[name*="retype" i], input[id*="retype" i], input[name*="re-enter" i], input[id*="re-enter" i]`
      : kind === "email"
        ? `, input[inputmode="email"], input[name*="mail" i], input[id*="mail" i]`
        : "";
  const css = `input[type="${t}"], input[name*="${kind}" i], input[id*="${kind}" i]${extra}`;
  const byCss = (root as any).locator?.(css);
  return await firstPresent([byCss as Locator]);
}

async function queryByRoleTextboxName(root: Root, kind: keyof typeof RX) {
  const rx = RX[kind];
  const role = (root as any).getByRole?.("textbox", { name: rx });
  if (role) {
    try {
      if ((await role.count()) > 0) return role.first();
    } catch {}
  }
  const near = (root as any).locator?.(
    `${textSelector(rx)} >> xpath=following::input[1]`
  );
  return await firstPresent([near as Locator]);
}

async function queryByAria(root: Root, kind: keyof typeof RX) {
  const hints: string[] = [
    `[aria-label*="${kind}" i]`,
    `[data-testid*="${kind}" i]`,
    `[data-qa*="${kind}" i]`,
  ];
  if (kind === "password")
    hints.push(
      '[autocomplete="current-password"]',
      '[autocomplete="new-password"]'
    );
  if (kind === "confirmPassword")
    hints.push(
      '[autocomplete="confirm-password"]',
      '[autocomplete="new-password"]'
    );
  if (kind === "email") hints.push('[autocomplete="email"]');

  const css = hints.join(", ");
  const byCss = (root as any).locator?.(css);
  return await firstPresent([byCss as Locator]);
}

async function queryByNearbyText(root: Root, kind: keyof typeof RX) {
  const rx = RX[kind];
  const textNode = (root as any).locator?.(textSelector(rx)).first();
  if (!textNode) return null;
  const nearInput = (textNode as any).locator?.("xpath=following::input[1]");
  try {
    if ((await nearInput.count()) > 0) return nearInput.first();
  } catch {}
  return null;
}

async function queryContentEditable(root: Root) {
  const byCss = (root as any).locator?.(
    '[contenteditable=""], [contenteditable="true"], [role="textbox"]'
  );
  return await firstPresent([byCss as Locator]);
}

async function queryGenericScored(
  root: Root,
  kind: keyof typeof RX
): Promise<Locator | null> {
  const selector = [
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
    "textarea",
    '[role="textbox"]',
    '[contenteditable=""], [contenteditable="true"]',
  ].join(", ");

  const loc = (root as any).locator?.(selector) as Locator | undefined;
  if (!loc) return null;

  const handles: ElementHandle[] = await loc.elementHandles().catch(() => []);
  if (!handles.length) return null;

  const rx = RX[kind];
  const scores: { idx: number; score: number }[] = [];

  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];

    const scoreVal = await h.evaluate(
      (node: Element, args: { rxSource: string; kind: keyof typeof RX }) => {
        const el = node as HTMLElement;
        const rx = new RegExp(args.rxSource, "i");
        let score = 0;

        const getAttr = (name: string) =>
          (el.getAttribute(name) || "").toString();
        const aName = getAttr("name");
        const aId = getAttr("id");
        const aPh = getAttr("placeholder");
        const aAria = getAttr("aria-label");
        const aAc = getAttr("autocomplete");
        const aType = (getAttr("type") || "").toLowerCase();

        if (rx.test(aName)) score += 3;
        if (rx.test(aId)) score += 3;
        if (rx.test(aPh)) score += 2;
        if (rx.test(aAria)) score += 2;
        if (rx.test(aAc)) score += 1;

        if (
          (args.kind === "password" || args.kind === "confirmPassword") &&
          aType === "password"
        )
          score += 3;
        if (args.kind === "email" && aType === "email") score += 3;

        if (el.id) {
          const lab = document.querySelector(
            `label[for="${CSS.escape(el.id)}"]`
          );
          if (lab && rx.test(lab.textContent || "")) score += 3;
        }

        const parentText = (el.parentElement?.textContent || "").trim();
        if (rx.test(parentText)) score += 1;

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) score += 1;

        if (args.kind === "email") {
          const txt = [aName, aId, aPh, aAria].join(" ").toLowerCase();
          if (txt.includes("mail")) score += 2;
        }

        return score;
      },
      { rxSource: rx.source, kind }
    );

    const sNum = Number(scoreVal) || 0;
    scores.push({ idx: i, score: sNum });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top || top.score <= 0) return null;
  return (loc as Locator).nth(top.idx);
}

export async function findField(root: Root, kind: keyof typeof RX) {
  return (
    (await queryByLabelOrPlaceholder(root, kind)) ||
    (await queryByTypeNameId(root, kind)) ||
    (await queryByRoleTextboxName(root, kind)) ||
    (await queryByAria(root, kind)) ||
    (await queryByNearbyText(root, kind)) ||
    (await queryContentEditable(root)) ||
    (await queryGenericScored(root, kind))
  );
}

export async function findSubmit(root: Root) {
  const byType = (root as any).locator?.(
    'button[type="submit"], input[type="submit"]'
  );
  const byName = (root as any).getByRole?.("button", {
    name: /sign\s?in|log\s?in|sign\s?up|register|submit|continue|next/i,
  });
  const anyBtn = (root as any).getByRole?.("button");
  return (
    (await firstPresent([byType as Locator])) ||
    (await firstPresent([byName as Locator])) ||
    (await firstPresent([anyBtn as Locator]))
  );
}

async function scoreForm(f: Locator) {
  let s = 0;
  for (const k of [
    "email",
    "password",
    "confirmPassword",
    "firstName",
    "lastName",
  ] as const) {
    const loc = await findField(f, k);
    if (loc) s++;
  }
  return s;
}

export async function pickAuthForm(page: Page) {
  const allRoots = await roots(page);
  let best: { root: Root; form: Locator | null; score: number } | null = null;

  for (const r of allRoots) {
    const forms: Locator | undefined = (r as any).locator?.("form");
    if (!forms) continue;
    const n = await forms.count();
    for (let i = 0; i < n; i++) {
      const f = forms.nth(i);
      const score = await scoreForm(f);
      if (!best || score > best.score) best = { root: r, form: f, score };
    }
  }

  return best ?? { root: page as Root, form: null, score: 0 };
}

export async function dryFillAuth(page: Page, creds: Creds) {
  const picked = await pickAuthForm(page);
  const root: Root = picked.form ?? picked.root;

  const email = await findField(root, "email");
  const password = await findField(root, "password");
  const confirmPassword = await findField(root, "confirmPassword");
  const firstName = await findField(root, "firstName");
  const lastName = await findField(root, "lastName");

  const typed: Record<string, boolean> = {};

  if (creds.firstName && firstName)
    typed.firstName = await typeHuman(firstName, creds.firstName);
  if (creds.lastName && lastName)
    typed.lastName = await typeHuman(lastName, creds.lastName);
  if (creds.email && email) typed.email = await typeHuman(email, creds.email);
  if (creds.password && password)
    typed.password = await typeHuman(password, creds.password);
  if (creds.confirmPassword && confirmPassword)
    typed.confirmPassword = await typeHuman(
      confirmPassword,
      creds.confirmPassword
    );

  return {
    found: {
      email: !!email,
      password: !!password,
      confirmPassword: !!confirmPassword,
      firstName: !!firstName,
      lastName: !!lastName,
    },
    typed,
    usedRoot: picked.form ? "form" : "root",
    score: picked.score,
  };
}

export async function submitAuth(page: Page) {
  const picked = await pickAuthForm(page);
  const root: Root = picked.form ?? picked.root;
  const submit = await findSubmit(root);
  if (!submit) throw new Error("Submit button not found");
  await submit.scrollIntoViewIfNeeded();
  await submit.click();
}
