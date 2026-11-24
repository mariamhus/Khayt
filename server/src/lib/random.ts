import { randomBytes, randomInt } from "node:crypto";


export const demoEmail = () => `demo-${randomBytes(6).toString("hex")}@demo.khayt.shop`;

export const demoPassword = () => randomBytes(24).toString("base64url");

export const pick = <T>(list: readonly T[], random: () => number) => list[Math.floor(random() * list.length)]!;

export function seeded(seed: number) {
  let state = seed >>> 0 || randomInt(1, 2 ** 31);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
