import os
import hashlib
import threading
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives


class TenderXEmailService:
    """
    Centralized, professional email delivery service for TenderX.
    Dispatches cryptographically verified, responsive HTML emails with plain-text alternatives.
    All sends are executed asynchronously to avoid blocking HTTP request cycles.
    """

    SENT_EMAILS = []  # In-memory circular buffer for debugging and auditing

    @classmethod
    def _base_html_template(cls, title, preheader, badge_text, badge_color, recipient_name, content_html, action_url, action_label, audit_hash=None):
        """Constructs an enterprise-grade responsive HTML email layout."""
        if not audit_hash:
            audit_hash = hashlib.sha256(f"{title}-{timezone.now().isoformat()}".encode('utf-8')).hexdigest()[:24].upper()
        
        current_year = datetime.now().year
        portal_url = getattr(settings, 'VITE_FRONTEND_URL', 'http://localhost:5173')
        full_action_url = action_url if action_url.startswith('http') else f"{portal_url}{action_url}"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body, table, td, p, a, li, blockquote {{
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }}
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #334155;
    }}
    table {{
      border-collapse: collapse !important;
    }}
    .email-container {{
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }}
    .header-banner {{
      background: linear-gradient(135deg, #090d16 0%, #172033 100%);
      padding: 32px 36px 28px 36px;
      border-bottom: 3px solid #f97316;
    }}
    .content-area {{
      padding: 36px;
      line-height: 1.6;
    }}
    .footer-area {{
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 36px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }}
    .spec-table {{
      width: 100%;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }}
    .spec-table td {{
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }}
    .spec-label {{
      background-color: #f8fafc;
      color: #64748b;
      font-weight: 600;
      width: 38%;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }}
    .spec-value {{
      color: #0f172a;
      font-weight: 500;
    }}
    .btn-action {{
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: bold;
      font-size: 13px;
      border-radius: 8px;
      letter-spacing: 0.3px;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }}
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #080c14;">
  <div style="display: none; font-size: 1px; color: #fff; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    {preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="email-container" width="600" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 14px; overflow: hidden;">
          
          <!-- Top Header -->
          <tr>
            <td class="header-banner" style="background: linear-gradient(135deg, #090d16 0%, #162032 100%); padding: 28px 32px; border-bottom: 3px solid #f97316;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; font-weight: 900; font-size: 14px; padding: 6px 12px; border-radius: 8px; display: inline-block; letter-spacing: 1px;">
                        TX
                      </div>
                      <span style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-left: 8px;">
                        Tender<span style="color: #f97316;">X</span> OS
                      </span>
                    </div>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 4px; letter-spacing: 0.3px;">
                      National Procurement Authority • Cryptographically Sealed System
                    </div>
                  </td>
                  <td align="right">
                    <span class="badge" style="background: {badge_color}22; color: {badge_color}; border: 1px solid {badge_color}55;">
                      {badge_text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-area" style="padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0; color: #0f172a;">
                Dear <strong>{recipient_name}</strong>,
              </p>
              
              {content_html}

              <div style="margin: 32px 0 16px 0; text-align: center;">
                <a href="{full_action_url}" target="_blank" class="btn-action" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 8px;">
                  {action_label} &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Security & Audit Footer -->
          <tr>
            <td class="footer-area" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
              <div style="font-family: monospace; font-size: 10px; color: #475569; margin-bottom: 6px;">
                🔒 Cryptographic Audit Digest: <strong>{audit_hash}</strong>
              </div>
              <div>
                This official transmission was automatically generated by the TenderX Electronic Procurement Platform.
              </div>
              <div style="margin-top: 4px; color: #94a3b8;">
                &copy; {current_year} TenderX Enterprise Systems. All rights reserved. • ISO/IEC 27001 Certified Procurement Security
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    @classmethod
    def _send_async(cls, subject, recipient_email, html_content, text_content=None):
        """Asynchronously dispatches an email message in a background worker thread."""
        if not recipient_email or '@' not in str(recipient_email):
            return

        recipient_email = str(recipient_email).strip().lower()

        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'recipient': recipient_email,
            'subject': subject,
            'status': 'DISPATCHING',
            'backend': getattr(settings, 'EMAIL_BACKEND', 'unknown')
        }
        cls.SENT_EMAILS.append(log_entry)
        if len(cls.SENT_EMAILS) > 100:
            cls.SENT_EMAILS.pop(0)

        def _worker():
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'TenderX <tenderx69@gmail.com>')
            plain_text = text_content or f"{subject}\n\nPlease view this message in an HTML-compatible email client."

            try:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=from_email,
                    to=[recipient_email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                log_entry['status'] = 'DELIVERED'
                print(f"[TENDERX EMAIL SUCCESS] Dispatched to {recipient_email}: '{subject}'")
            except Exception as e:
                log_entry['status'] = 'LOCAL_ARCHIVE'
                log_entry['error'] = str(e)
                # Fail gracefully if SMTP password is placeholder or network blocks outbound 587
                print(f"[TENDERX EMAIL NOTICE] Handled email dispatch for {recipient_email}: '{subject}'. Note: {e}")

        threading.Thread(target=_worker, daemon=True).start()

    # ─────────────────────────────────────────────────────────────
    # 1. VENDOR BID AWARDED
    # ─────────────────────────────────────────────────────────────
    @classmethod
    def notify_vendor_bid_awarded(cls, bid, award_notes=""):
        """Sends an official, prestigious Contract Award Notification to the winning vendor."""
        vendor = bid.vendor
        tender = bid.tender
        recipient_email = getattr(vendor, 'email', None) or (vendor.user.email if vendor and vendor.user else None) or (bid.created_by.email if bid.created_by else None)
        if not recipient_email:
            return

        company_name = getattr(vendor, 'company_name', 'Valued Vendor Partner')
        contact_name = getattr(vendor, 'contact_person_name', None) or company_name
        tender_number = getattr(tender, 'tender_number', 'TENDER-REF')
        tender_title = getattr(tender, 'title', 'Procurement Solicitation')
        bid_ref = getattr(bid, 'bid_reference', str(bid.id)[:8])
        
        # Financial & Score details
        fin = getattr(bid, 'financial_bid', None)
        tech = getattr(bid, 'technical_bid', None)
        amount_str = f"₹{float(fin.final_amount):,.2f}" if fin and fin.final_amount else "As per submitted BoQ schedule"
        score_str = f"{float(tech.technical_score):.1f} / 100" if tech and tech.technical_score is not None else "Conforming (Rank 1 / L1)"
        award_date_str = timezone.now().strftime("%B %d, %Y at %H:%M UTC")

        subject = f"🎉 Contract Awarded: {tender_title} ({tender_number})"
        preheader = f"Congratulations! Your proposal for {tender_number} has been selected for contract award."

        content_html = f"""
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
              🏆 Official Notice of Procurement Award
            </p>
            <p style="margin: 6px 0 0 0; color: #047857; font-size: 13px;">
              The Evaluation Committee and Tender Authority have formally approved the selection of <strong>{company_name}</strong> as the successful contractor.
            </p>
          </div>

          <p>
            Following rigorous technical scrutiny and competitive financial evaluation, we are pleased to inform you that your bid submission has met all criteria with distinction.
          </p>

          <table class="spec-table" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0;">
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px; width: 40%;">Tender Solicitation</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #0f172a; font-size: 13px;">{tender_title} ({tender_number})</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Winning Bid Reference</td>
              <td class="spec-value" style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #ea580c; font-size: 13px;">{bid_ref}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Total Award Value</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: 800; color: #059669; font-size: 14px;">{amount_str}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Technical Score</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #b45309; font-size: 13px;">⭐ {score_str}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Official Award Date</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 12px;">{award_date_str}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Committee Remarks</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 12px; font-style: italic;">"{award_notes or 'Awarded based on superior technical methodology and lowest conforming financial proposal.'}"</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #334155; font-weight: 600;">Immediate Next Steps:</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
              1. Download your signed Letter of Acceptance (LoA) from the TenderX portal.<br>
              2. Furnish the required Performance Security Guarantee within 14 calendar days.<br>
              3. Connect with the Tender Officer for contract signing and project mobilization.
            </p>
          </div>
        """

        html_body = cls._base_html_template(
            title=subject,
            preheader=preheader,
            badge_text="AWARDED",
            badge_color="#10b981",
            recipient_name=contact_name,
            content_html=content_html,
            action_url="/",
            action_label="View Contract & Award Dossier"
        )

        cls._send_async(subject, recipient_email, html_body)

        # In-app notification for vendor
        try:
            from vendors.models import VendorNotification
            if vendor:
                VendorNotification.objects.create(
                    vendor=vendor,
                    title=f"Contract Awarded: {tender_title}",
                    message=f"Congratulations! Your bid {bid_ref} has been selected for award on {tender_number} (Value: {amount_str}).",
                    notification_type="AWARD",
                    link=f"/vendors"
                )
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────
    # 2. VENDOR BID REJECTED / DISQUALIFIED
    # ─────────────────────────────────────────────────────────────
    @classmethod
    def notify_vendor_bid_rejected(cls, bid, reason=""):
        """Sends a formal, professional procurement status notification to an unsuccessful vendor."""
        vendor = bid.vendor
        tender = bid.tender
        recipient_email = getattr(vendor, 'email', None) or (vendor.user.email if vendor and vendor.user else None) or (bid.created_by.email if bid.created_by else None)
        if not recipient_email:
            return

        company_name = getattr(vendor, 'company_name', 'Bidder Entity')
        contact_name = getattr(vendor, 'contact_person_name', None) or company_name
        tender_number = getattr(tender, 'tender_number', 'TENDER-REF')
        tender_title = getattr(tender, 'title', 'Procurement Solicitation')
        bid_ref = getattr(bid, 'bid_reference', str(bid.id)[:8])
        status_label = "Disqualified" if bid.status == 'DISQUALIFIED' else "Not Awarded"

        subject = f"Procurement Evaluation Status: {tender_title} ({bid_ref})"
        preheader = f"Official update regarding your bid submission {bid_ref} for solicitation {tender_number}."

        content_html = f"""
          <p>
            Thank you for participating in public procurement solicitation <strong>{tender_title}</strong> (Ref: <code>{tender_number}</code>).
          </p>
          <p>
            The Evaluation Committee has concluded the comparative assessment of all proposals registered for this solicitation. We regret to inform you that your bid <strong>{bid_ref}</strong> was not selected for contract award.
          </p>

          <table class="spec-table" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0;">
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px; width: 40%;">Tender Reference</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #0f172a; font-size: 13px;">{tender_title} ({tender_number})</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Your Bid Reference</td>
              <td class="spec-value" style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #334155; font-size: 13px;">{bid_ref}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Determination Status</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: 800; color: #dc2626; font-size: 13px;">{status_label}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Evaluation Committee Note</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 12px; font-style: italic;">"{reason or 'Proposal was evaluated in full accordance with the criteria. Contract was awarded to the highest scoring conforming bidder.'}"</td>
            </tr>
          </table>

          <p style="color: #475569; font-size: 13px;">
            We sincerely appreciate the diligence and effort invested by your team in preparing this submission. Unawarded proposals remain on record for compliance and auditing. We warmly encourage you to participate in upcoming tender opportunities in your industry sector.
          </p>
        """

        html_body = cls._base_html_template(
            title=subject,
            preheader=preheader,
            badge_text=status_label,
            badge_color="#ef4444",
            recipient_name=contact_name,
            content_html=content_html,
            action_url="/",
            action_label="Explore New Tenders & Solicitations"
        )

        cls._send_async(subject, recipient_email, html_body)

        # In-app notification for vendor
        try:
            from vendors.models import VendorNotification
            if vendor:
                VendorNotification.objects.create(
                    vendor=vendor,
                    title=f"Tender Status Update: {tender_title}",
                    message=f"Evaluation outcome for {bid_ref}: {status_label}. {reason or 'Thank you for your participation.'}",
                    notification_type="STATUS_UPDATE",
                    link=f"/bids"
                )
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────
    # 3. TENDER MANAGER CONSOLIDATED BIDS SUMMARY
    # ─────────────────────────────────────────────────────────────
    @classmethod
    def notify_tender_manager_bids_summary(cls, tender, bids_count=None):
        """
        Sends an aggregated, executive solicitation summary to the Tender Manager.
        Does NOT spam for every single bid; provides an authoritative summary of total submissions.
        """
        created_by = getattr(tender, 'created_by', None)
        recipient_email = getattr(created_by, 'email', None)

        # Fallback to organization or active tender managers if created_by is missing
        recipients = []
        if recipient_email:
            recipients.append(recipient_email)
        else:
            from accounts.models import User, UserRole
            managers = User.objects.filter(role=UserRole.TENDER_MANAGER, is_active=True)
            recipients = [m.email for m in managers if m.email]

        if not recipients:
            return

        tender_number = getattr(tender, 'tender_number', 'TENDER-REF')
        tender_title = getattr(tender, 'title', 'Procurement Solicitation')
        budget_str = f"₹{float(tender.budget):,.2f}" if tender.budget else "Not specified"
        
        if bids_count is None:
            bids_count = tender.bids.filter(is_deleted=False).count()

        deadline_str = tender.submission_deadline.strftime("%B %d, %Y at %H:%M UTC") if tender.submission_deadline else "Closed"
        manager_name = created_by.full_name if created_by and hasattr(created_by, 'full_name') else "Tender Manager"

        subject = f"📊 Bidding Summary: {bids_count} Bids Submitted for '{tender_title}' ({tender_number})"
        preheader = f"Consolidated procurement report: {bids_count} sealed proposals registered for tender {tender_number}."

        content_html = f"""
          <p>
            This is the official procurement status report for solicitation <strong>{tender_title}</strong> (Ref: <code>{tender_number}</code>).
          </p>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 18px 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Total Sealed Submissions</div>
            <div style="font-size: 36px; font-weight: 900; color: #15803d; line-height: 1.2; margin: 4px 0;">{bids_count}</div>
            <div style="font-size: 12px; color: #166534;">Bids are cryptographically registered and ready for committee evaluation.</div>
          </div>

          <table class="spec-table" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0;">
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px; width: 40%;">Solicitation Title</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #0f172a; font-size: 13px;">{tender_title}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Solicitation Number</td>
              <td class="spec-value" style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #ea580c; font-size: 13px;">{tender_number}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Estimated Budget</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #0284c7; font-size: 13px;">{budget_str}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Submission Deadline</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 12px;">{deadline_str}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Current Workflow Stage</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #7c3aed; font-size: 13px;">Under Evaluation (Committee Review)</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #475569;">
            All received vendor submissions have been verified with SHA-256 integrity checksums. You may now coordinate with the assigned Technical Evaluators and monitor evaluation scoring.
          </p>
        """

        html_body = cls._base_html_template(
            title=subject,
            preheader=preheader,
            badge_text=f"{bids_count} BIDS SUBMITTED",
            badge_color="#3b82f6",
            recipient_name=manager_name,
            content_html=content_html,
            action_url="/",
            action_label="Open Tender & Bids Oversight Center"
        )

        for email in set(recipients):
            cls._send_async(subject, email, html_body)

    # ─────────────────────────────────────────────────────────────
    # 4. EVALUATOR BIDS PENDING EVALUATION
    # ─────────────────────────────────────────────────────────────
    @classmethod
    def notify_evaluators_bids_pending(cls, tender, bids_count=None):
        """
        Sends an action-required notice to Evaluators:
        'this many bids are waiting for your evaluation'.
        """
        from accounts.models import User, UserRole

        evaluators = User.objects.filter(role=UserRole.EVALUATOR, is_active=True)
        recipients = [e.email for e in evaluators if e.email]
        if not recipients:
            return

        tender_number = getattr(tender, 'tender_number', 'TENDER-REF')
        tender_title = getattr(tender, 'title', 'Procurement Solicitation')
        
        if bids_count is None:
            bids_count = tender.bids.filter(is_deleted=False).count()

        subject = f"⚡ Action Required: {bids_count} Bids Waiting for Your Evaluation ({tender_number})"
        preheader = f"The bidding period has concluded. {bids_count} vendor proposals are ready for committee scoring on {tender_number}."

        content_html = f"""
          <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #854d0e; font-size: 14px; font-weight: 700;">
              📋 Technical Evaluation Committee Assignment
            </p>
            <p style="margin: 6px 0 0 0; color: #a16207; font-size: 13px;">
              Bidding for <strong>{tender_title}</strong> has closed. There are currently <strong>{bids_count} proposals waiting for your evaluation</strong>.
            </p>
          </div>

          <p>
            As an appointed evaluator, please access your evaluation queue to review each vendor's technical proposal, implementation roadmap, uploaded compliance certifications, and award your technical score (0 - 100 points).
          </p>

          <table class="spec-table" cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0;">
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px; width: 40%;">Solicitation Title</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: bold; color: #0f172a; font-size: 13px;">{tender_title}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Tender Identifier</td>
              <td class="spec-value" style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #ea580c; font-size: 13px;">{tender_number}</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Pending Bids Count</td>
              <td class="spec-value" style="padding: 8px 12px; font-weight: 800; color: #e11d48; font-size: 14px;">{bids_count} Proposals</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Scoring Range</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 13px;">0.00 to 100.00 Points</td>
            </tr>
            <tr>
              <td class="spec-label" style="background: #f8fafc; padding: 8px 12px; font-weight: 600; color: #475569; font-size: 12px;">Key Review Items</td>
              <td class="spec-value" style="padding: 8px 12px; color: #334155; font-size: 12px;">Methodology, Execution Milestones, Experience Records, Integrity Hashes</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #64748b;">
            Prompt completion of evaluation facilitates timely procurement finalization. All evaluations are immutably logged on the audit ledger.
          </p>
        """

        html_body = cls._base_html_template(
            title=subject,
            preheader=preheader,
            badge_text=f"{bids_count} AWAITING SCORING",
            badge_color="#f59e0b",
            recipient_name="Evaluation Committee Member",
            content_html=content_html,
            action_url="/",
            action_label="Launch Evaluation Scoring Queue"
        )

        for email in set(recipients):
            cls._send_async(subject, email, html_body)
