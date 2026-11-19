import sys
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Smart Deployment Health Monitor — Credentials & Setup Guide")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.drawString(54, 36, "Confidential & Project Setup Reference")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        
        self.restoreState()

def build_pdf(filename="SETUP_AND_CREDENTIALS_GUIDE.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        leftIndent=8,
        rightIndent=8,
        spaceBefore=4,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )
    
    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0369A1")
    )

    story = []
    
    # Header Banner
    story.append(Paragraph("Smart Deployment Health Monitor", title_style))
    story.append(Paragraph("DevOps Pipeline — Credentials & Infrastructure Setup Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=12))

    # Section 1: Executive Summary & Checklist
    story.append(Paragraph("1. Requirements & Secrets Overview Checklist", h1_style))
    story.append(Paragraph(
        "To enable automated CI/CD and deploy the microservice to AWS EC2, you must provide credentials in two places: <b>Local AWS CLI</b> (for Terraform) and <b>GitHub Repository Secrets</b> (for GitHub Actions).",
        body_style
    ))

    # Summary Table
    table_data = [
        [
            Paragraph("Secret / Variable Name", table_header_style),
            Paragraph("Where to Configure", table_header_style),
            Paragraph("Description & Example Value", table_header_style)
        ],
        [
            Paragraph("DOCKERHUB_USER", table_cell_code),
            Paragraph("GitHub Secrets", table_cell_style),
            Paragraph("Your Docker Hub username (e.g., <i>johndoe</i>)", table_cell_style)
        ],
        [
            Paragraph("DOCKERHUB_TOKEN", table_cell_code),
            Paragraph("GitHub Secrets", table_cell_style),
            Paragraph("Personal Access Token (PAT) with Read & Write access", table_cell_style)
        ],
        [
            Paragraph("EC2_HOST", table_cell_code),
            Paragraph("GitHub Secrets", table_cell_style),
            Paragraph("Public IPv4 of the created EC2 (from Terraform output)", table_cell_style)
        ],
        [
            Paragraph("EC2_USER", table_cell_code),
            Paragraph("GitHub Secrets", table_cell_style),
            Paragraph("Default SSH user: <font name='Courier'>ubuntu</font>", table_cell_style)
        ],
        [
            Paragraph("EC2_KEY", table_cell_code),
            Paragraph("GitHub Secrets", table_cell_style),
            Paragraph("Full content of the private key (<font name='Courier'>.pem</font>) file", table_cell_style)
        ],
        [
            Paragraph("DISCORD_WEBHOOK_URL", table_cell_code),
            Paragraph("GitHub Secrets (Opt)", table_cell_style),
            Paragraph("Discord channel webhook URL for deployment status alerts", table_cell_style)
        ],
        [
            Paragraph("AWS Access Keys", table_cell_code),
            Paragraph("Local Shell (<font name='Courier'>aws configure</font>)", table_cell_style),
            Paragraph("IAM Access Key ID & Secret Key with EC2 / VPC permissions", table_cell_style)
        ]
    ]

    t = Table(table_data, colWidths=[1.5*inch, 1.4*inch, 4.1*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Section 2: AWS Setup
    story.append(Paragraph("2. How to Obtain AWS Credentials & Key Pair", h1_style))
    story.append(Paragraph("A. Create an AWS EC2 Key Pair (.pem file)", h2_style))
    story.append(Paragraph("• Log in to the <b>AWS Management Console</b> and navigate to <b>EC2</b>.", bullet_style))
    story.append(Paragraph("• In the left sidebar under <b>Network & Security</b>, click <b>Key Pairs</b>.", bullet_style))
    story.append(Paragraph("• Click <b>Create key pair</b>.", bullet_style))
    story.append(Paragraph("• Set Name: e.g. <font name='Courier'>smart-deploy-key</font>.", bullet_style))
    story.append(Paragraph("• Key pair type: <b>RSA</b> | Private key file format: <b>.pem</b>.", bullet_style))
    story.append(Paragraph("• Click <b>Create key pair</b>. Your browser will download <font name='Courier'>smart-deploy-key.pem</font>.", bullet_style))
    story.append(Paragraph("<i>Note: Keep this file secure. You will copy its entire text into GitHub Secret <font name='Courier'>EC2_KEY</font>.</i>", body_style))

    story.append(Paragraph("B. Create IAM User & Access Keys (For Local Terraform)", h2_style))
    story.append(Paragraph("• In AWS Console, search for <b>IAM</b> ➔ click <b>Users</b> ➔ <b>Create user</b>.", bullet_style))
    story.append(Paragraph("• Attach policies: <b>AmazonEC2FullAccess</b> and <b>AmazonVPCFullAccess</b>.", bullet_style))
    story.append(Paragraph("• Under user details ➔ <b>Security credentials</b> ➔ <b>Create access key</b>.", bullet_style))
    story.append(Paragraph("• Select <b>Command Line Interface (CLI)</b> and copy your <b>Access Key ID</b> and <b>Secret Access Key</b>.", bullet_style))
    story.append(Paragraph("• In your local terminal, run <font name='Courier'>aws configure</font> and paste the keys.", bullet_style))

    story.append(Spacer(1, 6))

    # Section 3: Docker Hub Setup
    story.append(Paragraph("3. How to Obtain Docker Hub Access Token", h1_style))
    story.append(Paragraph("• Visit <b>https://hub.docker.com</b> and sign in.", bullet_style))
    story.append(Paragraph("• Click your profile icon at top-right ➔ click <b>Account Settings</b>.", bullet_style))
    story.append(Paragraph("• In the left menu, select <b>Security</b>.", bullet_style))
    story.append(Paragraph("• Click <b>New Access Token</b>.", bullet_style))
    story.append(Paragraph("• Token Description: <font name='Courier'>github-actions-deploy</font>.", bullet_style))
    story.append(Paragraph("• Access Permissions: <b>Read, Write, Delete</b>.", bullet_style))
    story.append(Paragraph("• Click <b>Generate</b> and copy the token string (starts with <font name='Courier'>dckr_pat_...</font>).", bullet_style))
    story.append(Paragraph("• Set <font name='Courier'>DOCKERHUB_USER</font> to your username and <font name='Courier'>DOCKERHUB_TOKEN</font> to this token in GitHub.", body_style))

    story.append(Spacer(1, 6))

    # Section 4: Discord Webhook Setup
    story.append(Paragraph("4. How to Obtain Discord Webhook URL (Optional)", h1_style))
    story.append(Paragraph("• In Discord, open the server and channel where you want deployment notifications.", bullet_style))
    story.append(Paragraph("• Click the channel gear icon (<b>Edit Channel</b>) ➔ <b>Integrations</b> ➔ <b>Webhooks</b>.", bullet_style))
    story.append(Paragraph("• Click <b>New Webhook</b> (name it e.g. <i>Deploy Bot</i>).", bullet_style))
    story.append(Paragraph("• Click <b>Copy Webhook URL</b>.", bullet_style))
    story.append(Paragraph("• Add as secret <font name='Courier'>DISCORD_WEBHOOK_URL</font> in GitHub repository settings.", body_style))

    story.append(PageBreak())

    # Section 5: Adding Secrets to GitHub
    story.append(Paragraph("5. Adding Secrets to GitHub Repository", h1_style))
    story.append(Paragraph("1. Open your repository on GitHub (e.g. <font name='Courier'>https://github.com/your-username/Devop_Project</font>).", bullet_style))
    story.append(Paragraph("2. Navigate to <b>Settings</b> (top bar) ➔ <b>Secrets and variables</b> (left menu) ➔ <b>Actions</b>.", bullet_style))
    story.append(Paragraph("3. Click <b>New repository secret</b> for each of the following:", bullet_style))
    
    secrets_table = [
        [Paragraph("Secret Name", table_header_style), Paragraph("Exact Value to Enter", table_header_style)],
        [Paragraph("DOCKERHUB_USER", table_cell_code), Paragraph("Your Docker Hub username (e.g. <font name='Courier'>johndoe</font>)", table_cell_style)],
        [Paragraph("DOCKERHUB_TOKEN", table_cell_code), Paragraph("Personal Access Token from Docker Hub (<font name='Courier'>dckr_pat_...</font>)", table_cell_style)],
        [Paragraph("EC2_USER", table_cell_code), Paragraph("<font name='Courier'>ubuntu</font>", table_cell_style)],
        [Paragraph("EC2_HOST", table_cell_code), Paragraph("The public IPv4 address printed by Terraform (e.g. <font name='Courier'>54.210.32.110</font>)", table_cell_style)],
        [Paragraph("EC2_KEY", table_cell_code), Paragraph("Open your <font name='Courier'>.pem</font> file in Notepad and copy <b>everything</b> including:<br/><font name='Courier'>-----BEGIN RSA PRIVATE KEY-----<br/>...key body...<br/>-----END RSA PRIVATE KEY-----</font>", table_cell_style)],
        [Paragraph("DISCORD_WEBHOOK_URL", table_cell_code), Paragraph("The copied Discord Webhook URL (Optional)", table_cell_style)],
    ]
    t2 = Table(secrets_table, colWidths=[2.0*inch, 5.0*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t2)
    story.append(Spacer(1, 10))

    # Section 6: Terraform Execution
    story.append(Paragraph("6. Step-by-Step: Provisioning AWS with Terraform", h1_style))
    story.append(Paragraph("Execute the following commands from your project root in terminal:", body_style))
    
    terraform_cmds = (
        "# 1. Navigate into terraform directory\n"
        "cd terraform\n\n"
        "# 2. Initialize provider plugins\n"
        "terraform init\n\n"
        "# 3. Review planned resources\n"
        "terraform plan -var=\"key_name=smart-deploy-key\"\n\n"
        "# 4. Apply and create the EC2 instance & Security Group\n"
        "terraform apply -var=\"key_name=smart-deploy-key\" -auto-approve"
    )
    story.append(Paragraph(terraform_cmds.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Paragraph("<b>Post-Apply Actions:</b>", h2_style))
    story.append(Paragraph("• Terraform will output: <font name='Courier'>instance_public_ip = \"54.xxx.xxx.xxx\"</font>", bullet_style))
    story.append(Paragraph("• Copy this IP address and save it as <font name='Courier'>EC2_HOST</font> in GitHub Repository Secrets.", bullet_style))
    story.append(Paragraph("• The EC2 instance automatically installs Docker and sets up permissions within ~60 seconds via cloud-init.", bullet_style))

    story.append(Spacer(1, 6))

    # Section 7: Triggering CI/CD
    story.append(Paragraph("7. Triggering CI/CD Deployment & Verifying", h1_style))
    story.append(Paragraph("Option A: Automated Deployment via Git Tag", h2_style))
    
    git_cmds = (
        "git add .\n"
        "git commit -m \"feat: complete CI/CD and infrastructure setup\"\n"
        "git push origin main\n\n"
        "# Create and push release tag\n"
        "git tag v1.0.0\n"
        "git push origin v1.0.0"
    )
    story.append(Paragraph(git_cmds.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    story.append(Paragraph("Option B: Manual Workflow Trigger", h2_style))
    story.append(Paragraph("1. Go to your GitHub repository ➔ <b>Actions</b> tab.", bullet_style))
    story.append(Paragraph("2. Click on the <b>Deploy</b> workflow in the left sidebar.", bullet_style))
    story.append(Paragraph("3. Click the <b>Run workflow</b> dropdown button ➔ select <font name='Courier'>main</font> ➔ click <b>Run workflow</b>.", bullet_style))

    story.append(Paragraph("Verifying Live Service", h2_style))
    story.append(Paragraph("Once the GitHub Action completes successfully, open your browser or curl:", body_style))
    story.append(Paragraph("curl http://&lt;YOUR_EC2_PUBLIC_IP&gt;:3000/health", code_style))
    story.append(Paragraph("Expected Response: <font name='Courier'>{\"status\":\"ok\",\"service\":\"smart-health-monitor\",\"uptime\":\"...\"}</font>", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == '__main__':
    build_pdf()
