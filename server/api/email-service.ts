import { Request, Response } from 'express'

// Email service configuration
// For now, we'll use a simple console log approach
// In production, you'd use services like:
// - Resend (recommended)
// - SendGrid
// - AWS SES
// - Nodemailer with SMTP

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export interface ClientProjectAssignmentData {
  clientEmail: string
  clientName: string
  projectTitle: string
  projectId: number
  companyName: string
  loginUrl: string
  temporaryPassword?: string
}

export interface TeamProjectAssignmentData {
  memberEmail: string
  memberName: string
  projectTitle: string
  projectId: number
  clientName: string
  loginUrl: string
}

// Generate a temporary password for the client
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Create client project assignment email template
export function createClientProjectAssignmentEmail(data: ClientProjectAssignmentData): EmailTemplate {
  const { clientEmail, clientName, projectTitle, projectId, companyName, loginUrl, temporaryPassword } = data

  const subject = `Welcome to ${projectTitle} - Your Project Portal Access`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Portal Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .footer { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .credentials { background: #fff; border: 2px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Welcome to Your Project Portal</h1>
        <p>You've been assigned to a new project</p>
      </div>
      
      <div class="content">
        <p>Hi <strong>${clientName}</strong>,</p>
        
        <p>Great news! You've been assigned to the project <strong>"${projectTitle}"</strong> by ${companyName}.</p>
        
        <p>You now have access to your dedicated client portal where you can:</p>
        <ul>
          <li>📊 Track project progress in real-time</li>
          <li>💬 Communicate directly with the team</li>
          <li>📁 Access project files and deliverables</li>
          <li>✅ Review and approve milestones</li>
          <li>📋 Submit feedback and requests</li>
        </ul>

        ${temporaryPassword ? `
        <div class="credentials">
          <h3>🔐 Your Login Credentials</h3>
          <p><strong>Email:</strong> ${clientEmail}</p>
          <p><strong>Temporary Password:</strong> <span class="highlight">${temporaryPassword}</span></p>
          <p><small>⚠️ Please change your password after your first login for security.</small></p>
        </div>
        ` : `
        <div class="credentials">
          <h3>🔐 Login Information</h3>
          <p><strong>Email:</strong> ${clientEmail}</p>
          <p>Use your existing password or click "Forgot Password" to reset it.</p>
        </div>
        `}

        <div style="text-align: center;">
          <a href="${loginUrl}?project=${projectId}" class="btn">Access Your Project Portal</a>
        </div>

        <p>If you have any questions or need assistance, don't hesitate to reach out to the ${companyName} team.</p>
        
        <p>Welcome aboard!</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p><small>This email was sent because you were assigned to a project. If you believe this was sent in error, please contact ${companyName} directly.</small></p>
      </div>
      
      <div class="footer">
        <p>Powered by FunnelHQ | Professional Project Management</p>
        <p><a href="${loginUrl}" style="color: #cbd5e1;">Login to Portal</a> | <a href="mailto:support@funnelportals.com" style="color: #cbd5e1;">Get Support</a></p>
      </div>
    </body>
    </html>
  `

  const text = `
    Welcome to Your Project Portal!
    
    Hi ${clientName},
    
    You've been assigned to the project "${projectTitle}" by ${companyName}.
    
    ${temporaryPassword ? `
    Your Login Credentials:
    Email: ${clientEmail}
    Temporary Password: ${temporaryPassword}
    (Please change your password after first login)
    ` : `
    Login Email: ${clientEmail}
    Use your existing password or reset it if needed.
    `}
    
    Access your project portal: ${loginUrl}?project=${projectId}
    
    In your portal you can track progress, communicate with the team, access files, and more.
    
    Welcome aboard!
    
    ---
    Powered by FunnelHQ
  `

  return {
    to: clientEmail,
    subject,
    html,
    text
  }
}

// Create team member project assignment email template
export function createTeamProjectAssignmentEmail(data: TeamProjectAssignmentData): EmailTemplate {
  const { memberEmail, memberName, projectTitle, projectId, clientName, loginUrl } = data

  const subject = `New Project Assignment: ${projectTitle}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Assignment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .footer { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .project-info { background: #fff; border: 2px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 New Project Assignment</h1>
        <p>You've been assigned to a new project</p>
      </div>
      
      <div class="content">
        <p>Hi <strong>${memberName}</strong>,</p>
        
        <p>Great news! You've been assigned to work on <strong>"${projectTitle}"</strong> for our client ${clientName}.</p>
        
        <div class="project-info">
          <h3>📋 Project Details</h3>
          <p><strong>Project:</strong> ${projectTitle}</p>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Project ID:</strong> #${projectId}</p>
        </div>

        <p>As a team member on this project, you now have access to:</p>
        <ul>
          <li>📊 Project dashboard and progress tracking</li>
          <li>💬 Team collaboration tools</li>
          <li>📁 Project files and documents</li>
          <li>✅ Task management and assignments</li>
          <li>📝 Client communication history</li>
          <li>📈 Project analytics and reports</li>
        </ul>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="btn">Access Project Dashboard</a>
        </div>

        <p>If you have any questions about the project or need assistance, don't hesitate to reach out to your project manager or the team.</p>
        
        <p>Let's make this project a success!</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p><small>This email was sent because you were assigned to a project. If you believe this was sent in error, please contact your project manager.</small></p>
      </div>
      
      <div class="footer">
        <p>Powered by FunnelHQ 360 | Professional Project Management</p>
        <p><a href="${loginUrl}" style="color: #cbd5e1;">Project Dashboard</a> | <a href="mailto:support@funnelportals.com" style="color: #cbd5e1;">Get Support</a></p>
      </div>
    </body>
    </html>
  `

  const text = `
    New Project Assignment!
    
    Hi ${memberName},
    
    You've been assigned to work on "${projectTitle}" for our client ${clientName}.
    
    Project Details:
    - Project: ${projectTitle}
    - Client: ${clientName}
    - Project ID: #${projectId}
    
    You now have access to the project dashboard, team collaboration tools, task management, and more.
    
    Access your project dashboard: ${loginUrl}
    
    Let's make this project a success!
    
    ---
    Powered by FunnelHQ 360
  `

  return {
    to: memberEmail,
    subject,
    html,
    text
  }
}

// Send email (currently logs to console, replace with actual email service)
export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // For development: Log to console
    console.log('\n📧 EMAIL SENT:')
    console.log('To:', template.to)
    console.log('Subject:', template.subject)
    console.log('---')
    console.log(template.text || 'HTML email (text version not available)')
    console.log('---\n')

    // TODO: Replace with actual email service
    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'FunnelHQ <noreply@funnelportals.com>',
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    return { success: true, messageId: result.id };
    */

    // For now, simulate success
    return { 
      success: true, 
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// API endpoint to send client project assignment email
export const sendClientProjectAssignmentEmail = async (req: Request, res: Response) => {
  try {
    const emailData: ClientProjectAssignmentData = req.body

    // Validate required fields
    if (!emailData.clientEmail || !emailData.clientName || !emailData.projectTitle || !emailData.projectId) {
      return res.status(400).json({
        error: 'Missing required fields: clientEmail, clientName, projectTitle, and projectId are required'
      })
    }

    // Generate temporary password if not provided
    if (!emailData.temporaryPassword) {
      emailData.temporaryPassword = generateTemporaryPassword()
    }

    // Set default values
    emailData.companyName = emailData.companyName || 'FunnelHQ'
    emailData.loginUrl = emailData.loginUrl || `${process.env.CLIENT_URL || 'http://localhost:3002'}/client-portal`

    // Create and send email
    const emailTemplate = createClientProjectAssignmentEmail(emailData)
    const result = await sendEmail(emailTemplate)

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        temporaryPassword: emailData.temporaryPassword // Return for storing in database if needed
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      })
    }
  } catch (error) {
    console.error('Error in sendClientProjectAssignmentEmail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// API endpoint to send team member project assignment email
export const sendTeamProjectAssignmentEmail = async (req: Request, res: Response) => {
  try {
    const emailData: TeamProjectAssignmentData = req.body

    // Validate required fields
    if (!emailData.memberEmail || !emailData.memberName || !emailData.projectTitle || !emailData.projectId) {
      return res.status(400).json({
        error: 'Missing required fields: memberEmail, memberName, projectTitle, and projectId are required'
      })
    }

    // Set default values
    emailData.clientName = emailData.clientName || 'Client'
    emailData.loginUrl = emailData.loginUrl || `${process.env.CLIENT_URL || 'http://localhost:3002'}/projects/${emailData.projectId}`

    // Create and send email
    const emailTemplate = createTeamProjectAssignmentEmail(emailData)
    const result = await sendEmail(emailTemplate)

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      })
    }
  } catch (error) {
    console.error('Error in sendTeamProjectAssignmentEmail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Test endpoint to send a sample email
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const testData: ClientProjectAssignmentData = {
      clientEmail: req.body.email || 'test@example.com',
      clientName: 'John Doe',
      projectTitle: 'Website Redesign Project',
      projectId: 1,
      companyName: 'FunnelHQ',
      loginUrl: 'http://localhost:3002/client-portal',
      temporaryPassword: generateTemporaryPassword()
    }

    const emailTemplate = createClientProjectAssignmentEmail(testData)
    const result = await sendEmail(emailTemplate)

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      testData
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}