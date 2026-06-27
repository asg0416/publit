const blockedPatterns = [/주소.*공개|신상|전화번호/, /죽이|때리|찾아가자|폭행/, /마약|해킹|불법/, /혐오|꺼져라/];

export function isBlockedText(text: string): boolean {
  return blockedPatterns.some((pattern) => pattern.test(text));
}
