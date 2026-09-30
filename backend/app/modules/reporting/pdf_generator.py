import os
import html
import json
import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """
    Generates a professional PDF penetration testing report using ReportLab.
    Returns the PDF as a byte string.
    """
    buffer = io.BytesIO()
    # 1. Page settings & layout template
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    # 2. Styling System
    styles = getSampleStyleSheet()
    
    # Create custom ParagraphStyles (avoiding collisions with standard ones)
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=30
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SubSectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#334155'),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )
    
    code_style = ParagraphStyle(
        'EvidenceCode',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f8fafc'),
        borderColor=colors.HexColor('#e2e8f0'),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=10
    )

    story = []
    
    # =========================================================================
    # PAGE 1: TITLE & EXECUTIVE METRICS
    # =========================================================================
    story.append(Paragraph("Security Assessment Report", title_style))
    story.append(Paragraph(f"Target URL: {report_data['report_metadata']['target_url']}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Meta Details Block
    story.append(Paragraph("Scan Metadata", h1_style))
    meta_info = [
        [Paragraph("<b>Date of Scan:</b>", body_style), Paragraph(report_data['report_metadata']['scan_date'], body_style)],
        [Paragraph("<b>Scan Duration:</b>", body_style), Paragraph(report_data['report_metadata']['scan_duration'], body_style)],
        [Paragraph("<b>Total Findings:</b>", body_style), Paragraph(str(report_data['report_metadata']['total_findings']), body_style)]
    ]
    meta_table = Table(meta_info, colWidths=[120, 420])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9'))
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # Severity Breakdown Block
    story.append(Paragraph("Vulnerability Severity Summary", h1_style))
    sev_summary = report_data['report_metadata']['severity_summary']
    
    sev_cols = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    sev_values = [str(sev_summary.get(c, 0)) for c in sev_cols]
    
    sev_info = [
        [Paragraph(f"<b>{c}</b>", body_style) for c in sev_cols],
        [Paragraph(v, body_style) for v in sev_values]
    ]
    
    # Set headers background color to contrast severity
    sev_table = Table(sev_info, colWidths=[108]*5)
    sev_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BACKGROUND', (0,0), (0,0), colors.HexColor('#fee2e2')), # CRITICAL bg
        ('BACKGROUND', (1,0), (1,0), colors.HexColor('#ffedd5')), # HIGH bg
        ('BACKGROUND', (2,0), (2,0), colors.HexColor('#fef3c7')), # MEDIUM bg
        ('BACKGROUND', (3,0), (3,0), colors.HexColor('#dbeafe')), # LOW bg
        ('BACKGROUND', (4,0), (4,0), colors.HexColor('#f3f4f6')), # INFO bg
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(sev_table)
    story.append(Spacer(1, 20))
    
    # Executive Summary Text
    story.append(Paragraph("Executive Summary", h1_style))
    story.append(Paragraph(report_data.get("executive_summary", ""), body_style))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: RECONNAISSANCE SUMMARY
    # =========================================================================
    story.append(Paragraph("Reconnaissance Details", h1_style))
    recon = report_data.get("reconnaissance", {})
    
    recon_info = [
        [Paragraph("<b>Resolved Target IP:</b>", body_style), Paragraph(recon.get("resolved_ip", "N/A"), body_style)],
        [Paragraph("<b>Technologies Profile:</b>", body_style), Paragraph(", ".join(recon.get("detected_technologies", ["Generic Web Host"])), body_style)],
        [Paragraph("<b>Discovered Subdomains:</b>", body_style), Paragraph(", ".join(recon.get("subdomains", ["None"])) or "None", body_style)]
    ]
    recon_table = Table(recon_info, colWidths=[150, 390])
    recon_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0'))
    ]))
    story.append(recon_table)
    story.append(Spacer(1, 20))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3+: FINDINGS
    # =========================================================================
    story.append(Paragraph("Detailed Security Findings", h1_style))
    
    findings_list = report_data.get("findings", [])
    if not findings_list:
        story.append(Paragraph("No vulnerabilities were flagged during the automated discovery stage.", body_style))
    else:
        severity_colors = {
            "CRITICAL": colors.HexColor('#991b1b'),
            "HIGH": colors.HexColor('#c2410c'),
            "MEDIUM": colors.HexColor('#d97706'),
            "LOW": colors.HexColor('#1d4ed8'),
            "INFO": colors.HexColor('#4b5563')
        }
        
        for idx, finding in enumerate(findings_list):
            finding_blocks = []
            
            # Severity color
            sev_label = finding.get("severity", "MEDIUM").upper()
            sev_color = severity_colors.get(sev_label, colors.HexColor('#4b5563'))
            
            title_p = ParagraphStyle(
                f'FindingTitle_{idx}',
                parent=h2_style,
                textColor=sev_color,
                spaceBefore=15,
                keepWithNext=True
            )
            
            # Finding header: 1. SQL Injection in /api (HIGH)
            cve_part = f" [{finding.get('cve_id')}]" if finding.get("cve_id") else ""
            safe_title = html.escape(finding.get('title', 'Unknown Finding'))
            finding_blocks.append(Paragraph(f"<b>{idx+1}. {safe_title}</b> - <i>{sev_label} Severity</i>{cve_part}", title_p))
            
            # Details block
            finding_blocks.append(Paragraph(f"<b>Scanner Source:</b> {html.escape(finding.get('source_scanner', 'Unknown'))} | <b>Confidence:</b> {html.escape(finding.get('confidence', 'High'))}", body_style))
            finding_blocks.append(Paragraph("<b>Description:</b>", body_style))
            safe_desc = html.escape(finding.get("description", "No description provided."))
            finding_blocks.append(Paragraph(safe_desc, body_style))
            
            # Remediation block
            remediation_text = finding.get("remediation", "")
            if remediation_text:
                finding_blocks.append(Paragraph("<b>Remediation Guidance:</b>", body_style))
                # Preserve newline spacing for remediation lists
                safe_remed = html.escape(remediation_text)
                remed_formatted = safe_remed.replace("\n", "<br/>")
                finding_blocks.append(Paragraph(remed_formatted, body_style))
                
            # Evidence block (Request/Response snippets)
            evidence = finding.get("evidence")
            if evidence:
                finding_blocks.append(Paragraph("<b>Technical Evidence:</b>", body_style))
                
                # Check if evidence contains formatted request/response
                if isinstance(evidence, dict):
                    req_content = evidence.get("request", "")
                    res_content = evidence.get("response", "")
                    
                    if req_content or res_content:
                        combined_ev = ""
                        if req_content:
                            combined_ev += f"--- REQUEST ---\n{req_content}\n\n"
                        if res_content:
                            combined_ev += f"--- RESPONSE ---\n{res_content}"
                        # Escape tags inside preformatted blocks
                        esc_ev = combined_ev.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                        finding_blocks.append(Preformatted(esc_ev, code_style))
                    else:
                        esc_json = json.dumps(evidence, indent=2).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                        finding_blocks.append(Preformatted(esc_json, code_style))
                else:
                    esc_ev = str(evidence).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    finding_blocks.append(Preformatted(esc_ev, code_style))
            
            # Use KeepTogether to prevent a single finding from breaking weirdly across pages
            story.append(KeepTogether(finding_blocks))
            story.append(Spacer(1, 15))

    # 3. Build document
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
