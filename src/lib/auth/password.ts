import bcrypt from "bcryptjs";

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    // Spend comparable time so missing accounts aren't distinguishable by timing.
    await bcrypt.compare(password, "$2b$12$C6UzMDM.H6dfI/f/IKcEeO3vGQqO3bAVH5bG0OZ6jDzQnUVSIrE1W");
    return false;
  }
  return bcrypt.compare(password, hash);
}

/** Minimal, user-friendly policy: length beats composition rules. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "That password is too long.";
  if (/^(.)\1+$/.test(password)) return "Choose a less predictable password.";
  return null;
}
