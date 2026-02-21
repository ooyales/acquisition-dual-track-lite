import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT_MRR = `You are an expert federal acquisition Market Research Report (MRR) assistant. You help government acquisition professionals draft FAR-compliant Market Research Reports.

Your role:
- Ask clarifying questions about the requirement if needed
- Research and describe the market landscape for the product/service
- Identify potential vendors (large and small business)
- Assess small business availability (critical for the Small Business Office)
- Evaluate available contract vehicles (GSA Schedule, GWACs, ESI, BPAs)
- Recommend a competition strategy
- Flag TAA/SCRM concerns for IT products
- Write in formal but clear government prose

When drafting, follow this MRR structure:
1. Purpose & Scope
2. Requirement Description
3. Market Overview & Industry Trends
4. Vendor Identification (with business size)
5. Small Business Availability Assessment
6. Contract Vehicle Analysis
7. Price Analysis / Historical Pricing
8. Recommended Acquisition Strategy
9. Conclusion

Always cite FAR Part 10 (Market Research) requirements. Use specific, factual language. When you don't have specific pricing data, indicate where the team should insert actual quotes or historical data.

IMPORTANT: You are helping draft a real government document. Be thorough, specific, and FAR-compliant. Never fabricate vendor names or pricing — use realistic placeholders clearly marked as [TO BE VERIFIED] when specific data is needed.`;

const SYSTEM_PROMPT_JA = `You are an expert federal acquisition Justification & Approval (J&A) assistant. You help government acquisition professionals draft legally defensible justifications for other than full and open competition under FAR 6.302.

Your role:
- Understand the specific authority being cited (FAR 6.302-1 through 6.302-7)
- Build a compelling, fact-based argument for limiting competition
- Ensure all statutory requirements are addressed
- Anticipate questions from General Counsel and the reviewing authority
- Reference relevant case law and GAO protest decisions where helpful
- Write in formal legal/regulatory prose

When drafting a J&A, follow this structure:
1. Contracting Activity & Description of Action
2. Description of Supplies/Services
3. Authority Cited (specific FAR 6.302 subsection)
4. Demonstration that the Contractor's Unique Qualifications / Reasons Apply
5. Efforts to Ensure Maximum Competition (including market research summary)
6. Determination by the Contracting Officer
7. Certification (for actions over $750K)

Common authorities:
- FAR 6.302-1: Only one responsible source (most common for brand name/sole source)
- FAR 6.302-2: Unusual and compelling urgency
- FAR 6.302-3: Industrial mobilization or expert services
- FAR 6.302-7: Public interest (requires head of agency)

IMPORTANT: J&As are legal documents subject to protest. Every claim must be supportable. Never overstate exclusivity — instead, build the case methodically with specific technical facts. Mark any claims that need verification as [TO BE VERIFIED BY TECHNICAL TEAM].`;

const SCENARIOS = {
  mrr: [
    {
      label: "CrowdStrike EDR Renewal",
      prompt: "We need to renew our CrowdStrike Falcon endpoint detection and response (EDR) platform. Current contract is $800K/year, expiring in 4 months. About 500 endpoints across our agency. We're on a DoD network and need FedRAMP High authorization. The SOC team is trained on CrowdStrike and our SIEM integrations are built around it. Help me draft the Market Research Report."
    },
    {
      label: "Cloud Migration Services",
      prompt: "We need to procure cloud migration professional services to move 12 on-premise applications to AWS GovCloud. Estimated value $2.1M over 2 years. We need engineers with Secret clearance who have experience with FedRAMP authorization packages. This is a new competitive acquisition. Draft the MRR."
    },
    {
      label: "Network Switches (Hardware)",
      prompt: "We need to replace our aging Cisco Catalyst switches — about 48 units across 3 buildings. Estimated cost around $450K including installation. Our current network infrastructure is all Cisco and our network team is Cisco-certified. The CIO prefers staying with Cisco but the Small Business Office wants to know if there are alternatives. Help with the Market Research."
    }
  ],
  ja: [
    {
      label: "CrowdStrike Sole Source",
      prompt: "We need a J&A for sole source procurement of CrowdStrike Falcon EDR. Our market research found alternatives (Microsoft Defender, SentinelOne, Carbon Black) but CrowdStrike is the only FedRAMP-authorized EDR that integrates with our existing Splunk SIEM via their API, and our SOC has 3 years of custom detection rules built in CrowdStrike's platform. Switching would require 6-8 months of SOC retraining and rebuilding all detection rules. Estimated value $800K. Authority: FAR 6.302-1."
    },
    {
      label: "Urgent Bridge Contract",
      prompt: "We need a J&A under FAR 6.302-2 (urgency) for a 6-month bridge contract with our current IT support services contractor. The re-compete solicitation was delayed because the outgoing KO retired and the replacement is still getting up to speed. If we don't bridge, 15 IT support staff go home and our help desk stops functioning. Estimated bridge value $450K."
    },
    {
      label: "Brand Name Justification",
      prompt: "We need a brand name justification for Palo Alto Networks next-gen firewalls. Our entire security architecture is built on Palo Alto's Panorama management platform, our firewall rules (over 2,000 custom rules) are in PAN-OS format, and we have GlobalProtect VPN deployed to 500 remote users. The CISO states that switching firewall vendors would require a complete security architecture redesign estimated at $1.2M and 12 months. The firewall purchase itself is $380K."
    }
  ]
};

export default function AcquisitionAIAssistant() {
  const [mode, setMode] = useState("mrr");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docDraft, setDocDraft] = useState(null);
  const [showScenarios, setShowScenarios] = useState(true);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([]);
    setDocDraft(null);
    setShowScenarios(true);
  }, [mode]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    setShowScenarios(false);
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const sysPrompt = mode === "mrr" ? SYSTEM_PROMPT_MRR : SYSTEM_PROMPT_JA;
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: sysPrompt,
          messages: apiMessages
        })
      });

      const data = await response.json();
      const assistantText = data.content
        ?.map(block => block.type === "text" ? block.text : "")
        .filter(Boolean)
        .join("\n") || "I encountered an issue generating a response. Please try again.";

      const assistantMsg = { role: "assistant", content: assistantText };
      setMessages([...newMessages, assistantMsg]);

      if (assistantText.length > 800 && (
        assistantText.includes("Purpose") || 
        assistantText.includes("SECTION") ||
        assistantText.includes("1.") ||
        assistantText.includes("Description of")
      )) {
        setDocDraft(assistantText);
      }
    } catch (err) {
      setMessages([...newMessages, { 
        role: "assistant", 
        content: "Connection error — unable to reach the AI service. In a deployed environment, this would connect to your agency's authorized AI endpoint." 
      }]);
    }
    setLoading(false);
  };

  const formatMessage = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^(#{1,3})/)[1].length;
        const content = line.replace(/^#{1,3}\s*/, "");
        const sizes = { 1: "18px", 2: "16px", 3: "15px" };
        return (
          <div key={i} style={{
            fontSize: sizes[level],
            fontWeight: 600,
            color: "#f0f0f2",
            marginTop: i > 0 ? "20px" : "8px",
            marginBottom: "8px",
            letterSpacing: "-0.01em"
          }}>{content}</div>
        );
      }
      if (line.match(/^\*\*.*\*\*$/)) {
        return (
          <div key={i} style={{
            fontWeight: 600,
            color: "#e0e0e3",
            marginTop: "16px",
            marginBottom: "4px",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.04em"
          }}>{line.replace(/\*\*/g, "")}</div>
        );
      }
      if (line.match(/^[-•]\s/)) {
        return (
          <div key={i} style={{ 
            paddingLeft: "16px", 
            position: "relative",
            marginBottom: "4px",
            lineHeight: 1.6
          }}>
            <span style={{ 
              position: "absolute", left: 0, 
              color: "#4ba0ff" 
            }}>•</span>
            {line.replace(/^[-•]\s/, "").replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        return (
          <div key={i} style={{ 
            paddingLeft: "20px", 
            marginBottom: "4px",
            lineHeight: 1.6
          }}>
            {line.replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
        );
      }
      if (line.includes("[TO BE VERIFIED") || line.includes("[INSERT")) {
        return (
          <div key={i} style={{ lineHeight: 1.6 }}>
            {line.split(/(\[.*?\])/).map((part, j) =>
              part.startsWith("[") ? (
                <span key={j} style={{
                  background: "rgba(255,180,50,0.12)",
                  color: "#ffb432",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 500
                }}>{part}</span>
              ) : <span key={j}>{part.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
            )}
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} style={{ height: "8px" }} />;
      return <div key={i} style={{ lineHeight: 1.6 }}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</div>;
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#e8e8ed",
      fontFamily: "'Outfit', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(0,0,0,0.8)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            fontSize: "15px",
            fontWeight: 500,
            letterSpacing: "-0.01em"
          }}>
            Acquisition AI
          </div>
          <div style={{
            width: "1px",
            height: "20px",
            background: "rgba(255,255,255,0.12)"
          }} />
          <div style={{ display: "flex", gap: "4px" }}>
            {[
              { key: "mrr", label: "Market Research" },
              { key: "ja", label: "J&A / Sole Source" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "100px",
                  border: "none",
                  background: mode === tab.key ? "rgba(75,160,255,0.15)" : "transparent",
                  color: mode === tab.key ? "#4ba0ff" : "rgba(255,255,255,0.4)",
                  fontSize: "13px",
                  fontWeight: mode === tab.key ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit"
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>
        {docDraft && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(docDraft);
            }}
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(75,160,255,0.3)",
              background: "rgba(75,160,255,0.08)",
              color: "#4ba0ff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s"
            }}
          >Copy Draft</button>
        )}
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px",
        maxWidth: "800px",
        width: "100%",
        margin: "0 auto"
      }}>
        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{
            textAlign: "center",
            paddingTop: "80px",
            animation: "fadeUp 0.6s ease"
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
              marginBottom: "12px"
            }}>
              {mode === "mrr" ? "FAR Part 10 Compliant" : "FAR 6.302 Compliant"}
            </div>
            <div style={{
              fontSize: "32px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              marginBottom: "12px",
              background: "linear-gradient(135deg, #f5f5f7, rgba(255,255,255,0.5))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              {mode === "mrr" ? "Market Research Assistant" : "J&A Draft Assistant"}
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.4)",
              maxWidth: "460px",
              margin: "0 auto 40px",
              lineHeight: 1.6
            }}>
              {mode === "mrr"
                ? "Describe what you need to procure. I'll research the market landscape, identify vendors, assess small business availability, and draft a FAR-compliant Market Research Report."
                : "Describe the acquisition and why competition should be limited. I'll draft a legally defensible Justification & Approval citing the appropriate FAR authority."
              }
            </div>

            {showScenarios && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: "440px",
                margin: "0 auto"
              }}>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.2)",
                  marginBottom: "4px"
                }}>Try a scenario</div>
                {SCENARIOS[mode].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "14px",
                      fontWeight: 400,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      lineHeight: 1.4
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = "rgba(255,255,255,0.06)";
                      e.target.style.borderColor = "rgba(255,255,255,0.12)";
                      e.target.style.color = "rgba(255,255,255,0.8)";
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = "rgba(255,255,255,0.03)";
                      e.target.style.borderColor = "rgba(255,255,255,0.06)";
                      e.target.style.color = "rgba(255,255,255,0.6)";
                    }}
                  >{s.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: "24px",
              animation: "fadeUp 0.3s ease"
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: msg.role === "user" 
                  ? "rgba(255,255,255,0.08)" 
                  : "rgba(75,160,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: msg.role === "user" 
                  ? "rgba(255,255,255,0.5)" 
                  : "#4ba0ff"
              }}>
                {msg.role === "user" ? "Y" : "A"}
              </div>
              <div style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.02em"
              }}>
                {msg.role === "user" ? "You" : "Acquisition AI"}
              </div>
            </div>
            <div style={{
              paddingLeft: "32px",
              fontSize: "14px",
              fontWeight: 300,
              color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
              ...(msg.role === "assistant" && msg.content.length > 500 ? {
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "12px",
                padding: "20px 24px",
                marginLeft: "0"
              } : {})
            }}>
              {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ 
            marginBottom: "24px",
            animation: "fadeUp 0.3s ease"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "rgba(75,160,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "#4ba0ff"
              }}>A</div>
              <div style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.3)"
              }}>Acquisition AI</div>
            </div>
            <div style={{ paddingLeft: "32px" }}>
              <div style={{
                display: "flex",
                gap: "4px",
                alignItems: "center"
              }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#4ba0ff",
                    opacity: 0.4,
                    animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`
                  }} />
                ))}
                <span style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.25)",
                  marginLeft: "8px",
                  fontWeight: 300
                }}>
                  {mode === "mrr" ? "Researching market landscape..." : "Drafting justification..."}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px 24px",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(20px)"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          gap: "10px",
          alignItems: "flex-end"
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={mode === "mrr" 
              ? "Describe the product or service you need to procure..." 
              : "Describe why this acquisition needs limited competition..."
            }
            rows={1}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#e8e8ed",
              fontSize: "14px",
              fontWeight: 300,
              fontFamily: "inherit",
              lineHeight: 1.5,
              resize: "none",
              outline: "none",
              transition: "border-color 0.2s",
              maxHeight: "160px"
            }}
            onFocus={e => e.target.style.borderColor = "rgba(75,160,255,0.3)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              background: input.trim() && !loading ? "#4ba0ff" : "rgba(255,255,255,0.06)",
              color: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.2)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: input.trim() && !loading ? "pointer" : "default",
              fontFamily: "inherit",
              transition: "all 0.2s",
              whiteSpace: "nowrap"
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
        <div style={{
          maxWidth: "800px",
          margin: "8px auto 0",
          fontSize: "11px",
          color: "rgba(255,255,255,0.15)",
          textAlign: "center"
        }}>
          AI-generated drafts require human review. All documents must be verified by the Contracting Officer before use.
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
