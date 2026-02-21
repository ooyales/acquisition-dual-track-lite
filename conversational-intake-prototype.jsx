import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// RULES CONFIGURATION DATA (from acquisition-rules-config.xlsx)
// In production, this would be read from Dataverse/SharePoint.
// ═══════════════════════════════════════════════════════════════

const INTAKE_PATHS = [
  { id: "PATH-001", q1: "New", q2: "No specific vendor", vendor: "No", buyCategory: "Product", derivedType: "New Competitive", pipeline: "Full", docSet: "DOCSET-COMP-PRODUCT", approvalTemplate: "APPR-FULL", advisoryTriggers: ["SCRM","SBO","CIO","508"], notes: "Standard competitive product buy" },
  { id: "PATH-002", q1: "New", q2: "No specific vendor", vendor: "No", buyCategory: "Service", derivedType: "New Competitive", pipeline: "Full", docSet: "DOCSET-COMP-SERVICE", approvalTemplate: "APPR-FULL", advisoryTriggers: ["SBO","CIO","508"], notes: "Standard competitive service buy" },
  { id: "PATH-003", q1: "New", q2: "No specific vendor", vendor: "No", buyCategory: "Software/License", derivedType: "New Competitive", pipeline: "Full", docSet: "DOCSET-COMP-SOFTWARE", approvalTemplate: "APPR-FULL", advisoryTriggers: ["SBO","CIO","508","FedRAMP"], notes: "Cloud/SaaS competitive" },
  { id: "PATH-005", q1: "New", q2: "Specific vendor required", vendor: "Yes", buyCategory: "Product", derivedType: "Brand Name", pipeline: "Full + Legal", docSet: "DOCSET-BRAND", approvalTemplate: "APPR-FULL-LEGAL", advisoryTriggers: ["SCRM","CIO","508"], notes: "Brand name justification required" },
  { id: "PATH-006", q1: "New", q2: "Specific vendor required", vendor: "Yes", buyCategory: "Service", derivedType: "Sole Source", pipeline: "Full + Legal", docSet: "DOCSET-SOLESOURCE", approvalTemplate: "APPR-FULL-LEGAL", advisoryTriggers: ["CIO","508"], notes: "J&A required under FAR 6.302" },
  { id: "PATH-007", q1: "Continue/Extend", q2: "Option years remaining", derivedType: "Option Exercise", pipeline: "Abbreviated", docSet: "DOCSET-OPTION", approvalTemplate: "APPR-OPTION", advisoryTriggers: [], notes: "COR confirms performance, Finance certifies" },
  { id: "PATH-008", q1: "Continue/Extend", q2: "Expiring, want same contractor", derivedType: "Follow-On Sole Source", pipeline: "Full + Legal", docSet: "DOCSET-FOLLOWON-SS", approvalTemplate: "APPR-FULL-LEGAL", advisoryTriggers: ["SBO","CIO"], notes: "J&A + Market Research required" },
  { id: "PATH-009", q1: "Continue/Extend", q2: "Expiring, should compete", derivedType: "Re-Compete", pipeline: "Full", docSet: "DOCSET-RECOMPETE", approvalTemplate: "APPR-FULL", advisoryTriggers: ["SBO","CIO","508"], notes: "Full competition" },
  { id: "PATH-010", q1: "Continue/Extend", q2: "Need bridge for re-compete", derivedType: "Bridge Extension", pipeline: "KO-Abbreviated", docSet: "DOCSET-BRIDGE", approvalTemplate: "APPR-BRIDGE", advisoryTriggers: ["CIO"], notes: "Bridge/undefinitized action" },
  { id: "PATH-012", q1: "Continue/Extend", q2: "ODC CLIN execution", derivedType: "CLIN Execution — ODC", pipeline: "CLIN-Execution", docSet: "DOCSET-NONE", approvalTemplate: "APPR-CLIN-EXEC", advisoryTriggers: ["SCRM","CIO"], notes: "Check CLIN balance, PM→CTO approval" },
  { id: "PATH-013", q1: "Continue/Extend", q2: "Travel CLIN execution", derivedType: "CLIN Execution — Travel", pipeline: "CLIN-Execution", docSet: "DOCSET-NONE", approvalTemplate: "APPR-CLIN-EXEC", advisoryTriggers: [], notes: "Check CLIN balance, PM→CTO approval" },
  { id: "PATH-014", q1: "Change Existing", q2: "Add scope / increase funding", derivedType: "Bilateral Modification", pipeline: "Mod Pipeline", docSet: "DOCSET-BILAT-MOD", approvalTemplate: "APPR-MOD", advisoryTriggers: ["CIO"], notes: "Value of mod determines tier" },
  { id: "PATH-015", q1: "Change Existing", q2: "Admin correction", derivedType: "Unilateral Modification", pipeline: "KO-Only", docSet: "DOCSET-NONE", approvalTemplate: "APPR-KO-ONLY", advisoryTriggers: [], notes: "Log and notify" },
  { id: "PATH-016", q1: "Change Existing", q2: "Move $ between CLINs", derivedType: "CLIN Reallocation", pipeline: "KO-Only", docSet: "DOCSET-NONE", approvalTemplate: "APPR-KO-ONLY", advisoryTriggers: [], notes: "Log and notify" },
  { id: "PATH-017", q1: "Continue/Extend", q2: "ODC CLIN — insufficient funds", derivedType: "CLIN Execution + Funding Action", pipeline: "CLIN-Exec + Funding", docSet: "DOCSET-FUNDING-MOD", approvalTemplate: "APPR-CLIN-EXEC-FUND", advisoryTriggers: ["SCRM","CIO","FM"], notes: "Triggers bilateral mod for CLIN top-off" },
];

const DOCUMENT_RULES = [
  { id: "DOC-001", name: "Market Research Report (MRR)", acqTypes: ["New Competitive","Re-Compete","Follow-On Sole Source"], tiers: ["SAT","Above SAT","Major"], gate: "ASR", aiAssist: true },
  { id: "DOC-002", name: "J&A (Justification & Approval)", acqTypes: ["Sole Source","Brand Name","Follow-On Sole Source"], tiers: ["ALL"], gate: "ASR", aiAssist: true },
  { id: "DOC-003", name: "IGCE", acqTypes: ["New Competitive","Re-Compete","Follow-On Sole Source","Sole Source","Brand Name"], tiers: ["SAT","Above SAT","Major"], gate: "ASR", aiAssist: true },
  { id: "DOC-004", name: "SOW / Specification", acqTypes: ["New Competitive","Re-Compete","Brand Name"], tiers: ["ALL"], gate: "ISS", aiAssist: false, condition: "Product or Software" },
  { id: "DOC-005", name: "PWS / SOO", acqTypes: ["New Competitive","Re-Compete","Sole Source"], tiers: ["ALL"], gate: "ISS", aiAssist: true, condition: "Service" },
  { id: "DOC-006", name: "QASP", acqTypes: ["New Competitive","Re-Compete","Sole Source"], tiers: ["Above SAT","Major"], gate: "KO Review", aiAssist: true, condition: "Service" },
  { id: "DOC-007", name: "Acquisition Strategy", acqTypes: ["New Competitive","Re-Compete"], tiers: ["Above SAT","Major"], gate: "ASR", aiAssist: true },
  { id: "DOC-008", name: "Source Selection Plan", acqTypes: ["New Competitive","Re-Compete"], tiers: ["Above SAT","Major"], gate: "KO Review", aiAssist: false },
  { id: "DOC-009", name: "Small Business Coordination", acqTypes: ["New Competitive","Re-Compete"], tiers: ["SAT","Above SAT","Major"], gate: "ASR", aiAssist: false },
  { id: "DOC-013", name: "Funding Certification (PR&C)", acqTypes: ["New Competitive","Re-Compete","Follow-On Sole Source","Sole Source","Brand Name","Option Exercise"], tiers: ["ALL"], gate: "KO Review", aiAssist: false },
  { id: "DOC-015", name: "SCRM Assessment", acqTypes: ["New Competitive","Re-Compete","Brand Name","Sole Source"], tiers: ["ALL"], gate: "ISS", aiAssist: false, condition: "Product or Software" },
  { id: "DOC-017", name: "Bridge Justification", acqTypes: ["Bridge Extension"], tiers: ["ALL"], gate: "KO Review", aiAssist: true },
  { id: "DOC-018", name: "Option Exercise Letter", acqTypes: ["Option Exercise"], tiers: ["ALL"], gate: "KO Action", aiAssist: false },
  { id: "DOC-021", name: "Funding Modification Package", acqTypes: ["CLIN Execution + Funding Action"], tiers: ["ALL"], gate: "KO Action", aiAssist: false },
  { id: "DOC-022", name: "Travel Authorization", acqTypes: ["CLIN Execution — Travel"], tiers: ["ALL"], gate: "PM Approval", aiAssist: false },
];

const APPROVAL_TEMPLATES = {
  "APPR-FULL": [
    { step: 1, name: "ISS", role: "Branch Chief", timeout: 5 },
    { step: 2, name: "ASR", role: "Acquisition Review Board", timeout: 7 },
    { step: 3, name: "Finance", role: "Budget Officer", timeout: 5 },
    { step: 4, name: "KO Review", role: "Contracting Officer", timeout: 7 },
    { step: 5, name: "CIO Approval", role: "CIO", timeout: 5, conditional: "IT acquisition" },
  ],
  "APPR-FULL-LEGAL": [
    { step: 1, name: "ISS", role: "Branch Chief", timeout: 5 },
    { step: 2, name: "ASR", role: "Acquisition Review Board", timeout: 7 },
    { step: 3, name: "Legal Review", role: "General Counsel", timeout: 10 },
    { step: 4, name: "Finance", role: "Budget Officer", timeout: 5 },
    { step: 5, name: "KO Review", role: "Contracting Officer", timeout: 7 },
  ],
  "APPR-OPTION": [
    { step: 1, name: "COR Confirmation", role: "COR", timeout: 3 },
    { step: 2, name: "Finance", role: "Budget Officer", timeout: 5 },
    { step: 3, name: "KO Execution", role: "Contracting Officer", timeout: 5 },
  ],
  "APPR-BRIDGE": [
    { step: 1, name: "COR + PM Justification", role: "COR", timeout: 3 },
    { step: 2, name: "KO Determination", role: "Contracting Officer", timeout: 5 },
  ],
  "APPR-KO-ONLY": [
    { step: 1, name: "KO Action", role: "Contracting Officer", timeout: 5 },
  ],
  "APPR-CLIN-EXEC": [
    { step: 1, name: "PM Approval", role: "Program Manager", timeout: 3 },
    { step: 2, name: "CTO Approval", role: "CTO", timeout: 3 },
    { step: 3, name: "COR Authorization", role: "COR", timeout: 2 },
  ],
  "APPR-CLIN-EXEC-FUND": [
    { step: 1, name: "FM Funding ID", role: "Financial Manager", timeout: 5 },
    { step: 2, name: "BM LOA Confirm", role: "Business Manager", timeout: 3 },
    { step: 3, name: "KO Contract Mod", role: "Contracting Officer", timeout: 7 },
    { step: 4, name: "PM Approval", role: "Program Manager", timeout: 3 },
    { step: 5, name: "CTO Approval", role: "CTO", timeout: 3 },
    { step: 6, name: "COR Authorization", role: "COR", timeout: 2 },
  ],
  "APPR-MOD": [
    { step: 1, name: "COR Justification", role: "COR", timeout: 5 },
    { step: 2, name: "Finance", role: "Budget Officer", timeout: 5 },
    { step: 3, name: "KO Review", role: "Contracting Officer", timeout: 7 },
  ],
};

const THRESHOLDS = {
  microPurchase: 15000,
  sat: 350000,
  aboveSatCeiling: 9000000,
  jaCO: 900000,
};

// Sample contract data for demo
const SAMPLE_CONTRACTS = [
  { name: "Accenture Federal — Cybersecurity Services", number: "FA8773-24-D-0042", clins: [
    { number: "0001", desc: "Labor (FFP)", type: "Service", ceiling: 3200000, obligated: 1600000, invoiced: 1280000 },
    { number: "0002", desc: "ODC — HW/SW", type: "ODC", ceiling: 800000, obligated: 450000, invoiced: 380000 },
    { number: "0003", desc: "Travel", type: "Travel", ceiling: 200000, obligated: 120000, invoiced: 82000 },
  ]},
  { name: "SAIC — IT Support Services", number: "W91CRB-23-D-0018", clins: [
    { number: "0001", desc: "Labor (T&M)", type: "Service", ceiling: 4200000, obligated: 2100000, invoiced: 1750000 },
    { number: "0002", desc: "ODC — Equipment", type: "ODC", ceiling: 600000, obligated: 350000, invoiced: 290000 },
    { number: "0003", desc: "Travel", type: "Travel", ceiling: 150000, obligated: 100000, invoiced: 65000 },
  ]},
];

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT FOR CONVERSATIONAL INTAKE
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an AI-powered acquisition intake assistant for a federal IT Directorate. Your job is to understand what the user needs and match their request to the correct acquisition pathway, using the rules configuration data provided below.

## YOUR BEHAVIOR

1. Listen to the user's natural language description of what they need.
2. Ask clarifying questions ONLY if you cannot determine the pathway. Keep questions conversational and minimal.
3. Once you have enough information, output your analysis in a STRUCTURED FORMAT (see below).
4. Be warm, professional, and knowledgeable about federal acquisition. You understand FAR, DFARS, CLINs, ODCs, and IT procurement.
5. When you identify a CLIN execution (ODC or Travel), check the contract data to determine if funds are sufficient.

## RULES CONFIGURATION DATA

### Intake Paths (from rules workbook):
${JSON.stringify(INTAKE_PATHS, null, 2)}

### Thresholds:
- Micro-Purchase: ≤ $${THRESHOLDS.microPurchase.toLocaleString()}
- SAT: $${THRESHOLDS.microPurchase.toLocaleString()} – $${THRESHOLDS.sat.toLocaleString()}
- Above SAT: $${THRESHOLDS.sat.toLocaleString()} – $${THRESHOLDS.aboveSatCeiling.toLocaleString()}
- Major: > $${THRESHOLDS.aboveSatCeiling.toLocaleString()}

### Active Contracts (for CLIN execution lookups):
${JSON.stringify(SAMPLE_CONTRACTS, null, 2)}

## OUTPUT FORMAT

When you have enough information to classify the request, output your analysis inside a special block like this:

---INTAKE_RESULT---
{
  "pathId": "PATH-XXX",
  "derivedType": "...",
  "pipeline": "...",
  "tier": "Micro-Purchase|SAT|Above SAT|Major",
  "estimatedValue": 0,
  "buyCategory": "Product|Service|Software/License|Mixed",
  "contract": "contract name if CLIN execution",
  "clin": "CLIN number if applicable",
  "clinBalance": "sufficient|insufficient",
  "fundingGap": 0,
  "advisoryTeams": ["SCRM", "CIO", ...],
  "documents": ["Doc Name 1", "Doc Name 2", ...],
  "approvalSteps": ["Step 1 Name — Role", "Step 2 Name — Role", ...],
  "summary": "One paragraph explaining what this request is and what happens next"
}
---END_RESULT---

Always include this structured block when you've made a determination. You can include conversational text before and after it.

## IMPORTANT RULES
- Never fabricate contract data. Only reference contracts listed above.
- For CLIN executions, always calculate: Available = Obligated - Invoiced - (any pending you know about)
- If the CLIN doesn't have enough funds, switch to the Funding Action path (PATH-017 for ODC).
- Always determine the tier from the estimated value and thresholds.
- Always list the specific documents required based on the acquisition type.
- Always list the approval steps from the matching approval template.
- Keep your conversational responses concise — this is a workflow tool, not a chat session.`;

// ═══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════

const DEMO_SCENARIOS = [
  { label: "PCAP Renewal via Cyber ODC", prompt: "I need to renew our PCAP tool through the Cybersecurity contract's ODC CLIN. The renewal quote from the vendor is $25K for 12 months." },
  { label: "Gigamon Maintenance — Short on $", prompt: "We need to renew Gigamon GigaVUE maintenance. It's on the Accenture Cybersecurity contract, ODC CLIN 0002. Quote is $95K. I think the CLIN might be running low." },
  { label: "Conference Travel", prompt: "One of our engineers needs to attend the RSA Conference in San Francisco next month. 4 days, flying from DC. Charge to the Cybersecurity contract travel CLIN." },
  { label: "CrowdStrike Re-Compete", prompt: "Our CrowdStrike EDR contract expires in 6 months. It's about $800K annually. We should compete it this time — there are other capable vendors now." },
  { label: "Palo Alto Sole Source", prompt: "We need to renew our Palo Alto firewall support. Only Palo Alto can maintain these — we have 2,000 custom firewall rules in Panorama. $650K for 3 years." },
  { label: "Option Year Exercise", prompt: "Time to exercise Option Year 3 on the SAIC IT Support Services contract." },
];

export default function ConversationalIntake() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intakeResult, setIntakeResult] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseIntakeResult = (text) => {
    const match = text.match(/---INTAKE_RESULT---([\s\S]*?)---END_RESULT---/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const cleanMessageText = (text) => {
    return text.replace(/---INTAKE_RESULT---[\s\S]*?---END_RESULT---/, "").trim();
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setIntakeResult(null);

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.map(b => b.text || "").join("") || "I encountered an error. Please try again.";
      const result = parseIntakeResult(assistantText);
      if (result) setIntakeResult(result);

      setMessages([...newMessages, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Connection error. Please check your network and try again." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setIntakeResult(null);
    setInput("");
  };

  // ─── Tier badge colors ───
  const tierColor = (tier) => {
    const colors = {
      "Micro-Purchase": { bg: "rgba(52,211,153,0.15)", text: "#34d399", border: "rgba(52,211,153,0.3)" },
      "SAT": { bg: "rgba(75,160,255,0.15)", text: "#4ba0ff", border: "rgba(75,160,255,0.3)" },
      "Above SAT": { bg: "rgba(255,180,50,0.15)", text: "#ffb432", border: "rgba(255,180,50,0.3)" },
      "Major": { bg: "rgba(248,113,113,0.15)", text: "#f87171", border: "rgba(248,113,113,0.3)" },
    };
    return colors[tier] || colors["SAT"];
  };

  const fundingColor = (status) => {
    if (status === "sufficient") return { bg: "rgba(52,211,153,0.15)", text: "#34d399" };
    return { bg: "rgba(248,113,113,0.15)", text: "#f87171" };
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000", color: "#f5f5f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ─── LEFT: Chat Panel ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ba0ff", marginBottom: 4 }}>
              Conversational Intake
            </div>
            <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.01em" }}>
              Acquisition AI Assistant
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowRules(!showRules)} style={{ padding: "6px 14px", borderRadius: 8, background: showRules ? "rgba(75,160,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${showRules ? "rgba(75,160,255,0.3)" : "rgba(255,255,255,0.08)"}`, color: showRules ? "#4ba0ff" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              {showRules ? "Hide Rules" : "View Rules"}
            </button>
            <button onClick={resetChat} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              New Request
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Describe what you need</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 450, margin: "0 auto 32px", lineHeight: 1.6 }}>
                Tell me what you're trying to acquire, renew, or authorize — in plain English. I'll figure out the acquisition type, required documents, approval chain, and advisory teams.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600, margin: "0 auto" }}>
                {DEMO_SCENARIOS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.prompt)} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 400, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.target.style.background = "rgba(75,160,255,0.1)"; e.target.style.borderColor = "rgba(75,160,255,0.3)"; e.target.style.color = "#4ba0ff"; }}
                    onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.color = "rgba(255,255,255,0.6)"; }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: m.role === "user" ? "rgba(255,255,255,0.25)" : "#4ba0ff", marginBottom: 6 }}>
                {m.role === "user" ? "You" : "Acquisition AI"}
              </div>
              <div style={{
                maxWidth: "85%",
                padding: "14px 18px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user" ? "rgba(75,160,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${m.role === "user" ? "rgba(75,160,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.85)",
                whiteSpace: "pre-wrap"
              }}>
                {cleanMessageText(m.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ba0ff", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              Analyzing your request against rules configuration...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you need to acquire, renew, or authorize..."
              rows={2}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f5f5f7", fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none" }}
            />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ padding: "12px 20px", borderRadius: 12, background: loading || !input.trim() ? "rgba(255,255,255,0.05)" : "#4ba0ff", border: "none", color: loading || !input.trim() ? "rgba(255,255,255,0.2)" : "#000", fontSize: 14, fontWeight: 600, cursor: loading || !input.trim() ? "default" : "pointer" }}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Result Panel ─── */}
      <div style={{ width: showRules ? 520 : (intakeResult ? 420 : 0), transition: "width 0.3s ease", overflowY: "auto", overflowX: "hidden", background: "rgba(255,255,255,0.02)", borderLeft: (intakeResult || showRules) ? "1px solid rgba(255,255,255,0.06)" : "none" }}>

        {showRules && !intakeResult && (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#4ba0ff", marginBottom: 16 }}>Rules Engine (Live Data)</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.5 }}>
              The AI reads from these tables at runtime. In production, these come from the rules configuration workbook stored in Dataverse or SharePoint.
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{INTAKE_PATHS.length} Intake Paths</div>
            {INTAKE_PATHS.map((p, i) => (
              <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                <span style={{ color: "#4ba0ff", fontWeight: 600 }}>{p.id}</span> — {p.derivedType}
                <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 8 }}>{p.pipeline}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, marginTop: 20 }}>{DOCUMENT_RULES.length} Document Rules</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, marginTop: 12 }}>{Object.keys(APPROVAL_TEMPLATES).length} Approval Templates</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, marginTop: 12 }}>4 Threshold Values</div>
          </div>
        )}

        {intakeResult && (
          <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#4ba0ff", marginBottom: 16 }}>
              Intake Result
            </div>

            {/* Path + Type */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(75,160,255,0.12)", border: "1px solid rgba(75,160,255,0.25)", color: "#4ba0ff", fontSize: 11, fontWeight: 600 }}>
                  {intakeResult.pathId}
                </span>
                {intakeResult.tier && (() => {
                  const tc = tierColor(intakeResult.tier);
                  return <span style={{ padding: "3px 10px", borderRadius: 6, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, fontSize: 11, fontWeight: 600 }}>{intakeResult.tier}</span>;
                })()}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{intakeResult.derivedType}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Pipeline: {intakeResult.pipeline}</div>
              {intakeResult.estimatedValue > 0 && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Est. Value: ${intakeResult.estimatedValue?.toLocaleString()}</div>
              )}
            </div>

            {/* CLIN Balance (if applicable) */}
            {intakeResult.clinBalance && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>CLIN Funding Status</div>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: fundingColor(intakeResult.clinBalance).bg, border: `1px solid ${fundingColor(intakeResult.clinBalance).text}33` }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: fundingColor(intakeResult.clinBalance).text }}>
                    {intakeResult.clinBalance === "sufficient" ? "✓ Funds Sufficient" : "⚠ Funding Action Required"}
                  </div>
                  {intakeResult.contract && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{intakeResult.contract}</div>}
                  {intakeResult.clin && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>CLIN {intakeResult.clin}</div>}
                  {intakeResult.fundingGap > 0 && <div style={{ fontSize: 12, color: fundingColor(intakeResult.clinBalance).text, marginTop: 4 }}>Gap: ${intakeResult.fundingGap?.toLocaleString()}</div>}
                </div>
              </div>
            )}

            {/* Advisory Teams */}
            {intakeResult.advisoryTeams?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Advisory Teams (Parallel)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {intakeResult.advisoryTeams.map((t, i) => (
                    <span key={i} style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {intakeResult.documents?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Required Documents ({intakeResult.documents.length})</div>
                {intakeResult.documents.map((d, i) => (
                  <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>○</span> {d}
                  </div>
                ))}
              </div>
            )}
            {intakeResult.documents?.length === 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Required Documents</div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", fontSize: 12, color: "#34d399" }}>
                  No documents required — execution only
                </div>
              </div>
            )}

            {/* Approval Pipeline */}
            {intakeResult.approvalSteps?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Approval Pipeline</div>
                {intakeResult.approvalSteps.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(75,160,255,0.15)", border: "1px solid rgba(75,160,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#4ba0ff" }}>
                        {i + 1}
                      </div>
                      {i < intakeResult.approvalSteps.length - 1 && (
                        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{s}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {intakeResult.summary && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Summary</div>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(75,160,255,0.06)", border: "1px solid rgba(75,160,255,0.12)", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                  {intakeResult.summary}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "#4ba0ff", border: "none", color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Create Request →
              </button>
              <button onClick={resetChat} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        textarea:focus { border-color: rgba(75,160,255,0.4) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}
