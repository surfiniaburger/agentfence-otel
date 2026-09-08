const expectedFile = "src/payments.js";
const expectedTokens = ["Number.isFinite", "amount <= 0", "Invalid payment amount"];

export function analyzePatch({ diff, finding }) {
  const text = diff || "";
  const files = [...text.matchAll(/@@\s+([^\n]+)/g)].map((match) => match[1].trim());
  const modifiedExpectedFile = text.includes(expectedFile);
  const networkChange = /\b(fetch|axios|http|https|XMLHttpRequest|WebSocket)\b/i.test(text);
  const secretAccess = /JWT_SECRET|process\.env|API_KEY|SECRET|TOKEN/i.test(text);
  const permissionChange = /chmod|permission|role|admin|sudo|grant/i.test(text);
  const expectedLogic = expectedTokens.every((token) => text.includes(token));
  const onlyExpectedFile = files.length === 0 || files.every((file) => file.includes(expectedFile));
  const unrelatedScope = !modifiedExpectedFile || !onlyExpectedFile;

  const checks = [
    { label: "Targets intended file", pass: modifiedExpectedFile, detail: modifiedExpectedFile ? expectedFile : "Expected file not detected" },
    { label: "Matches finding remediation", pass: expectedLogic, detail: expectedLogic ? "Finite positive amount validation" : "Expected validation logic not detected" },
    { label: "No new network calls", pass: !networkChange, detail: networkChange ? "Network-related change detected" : "None detected" },
    { label: "No secret access", pass: !secretAccess, detail: secretAccess ? "Secret/environment access detected" : "None detected" },
    { label: "No permission escalation", pass: !permissionChange, detail: permissionChange ? "Permission-related change detected" : "None detected" },
    { label: "Change scope is narrow", pass: !unrelatedScope, detail: !unrelatedScope ? "One expected file" : "Unexpected file scope" },
  ];

  const passed = checks.every((check) => check.pass);
  const risk = passed ? "LOW" : "ELEVATED";

  return {
    verdict: passed ? "INDEPENDENT CHECK: PASS" : "INDEPENDENT CHECK: REVIEW",
    risk,
    passed,
    checks,
    summary: passed
      ? `Independent analysis agrees the patch is narrowly scoped to ${finding?.file || expectedFile} and contains the expected remediation.`
      : "Independent analysis found a property that requires additional human review.",
  };
}
