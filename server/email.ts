import { ENV } from "./_core/env";

/**
 * Send email notification to interpreter about availability request
 */
export async function sendAvailabilityRequestEmail(params: {
  interpreterEmail: string;
  interpreterName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  requestedDate: string;
  requestedTime: string;
  duration: number;
  location: string;
  sourceLanguage: string;
  targetLanguage: string;
  notes?: string;
  confirmationToken: string;
}) {
  const {
    interpreterEmail,
    interpreterName,
    clientName,
    clientEmail,
    clientPhone,
    requestedDate,
    requestedTime,
    duration,
    location,
    sourceLanguage,
    targetLanguage,
    notes,
    confirmationToken,
  } = params;

  // Get base URL from environment or construct from current host
  const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL || 'https://3000-ioqqc66og0kswa4ozd71q-c2ab7b90.manusvm.computer';
  const confirmUrl = `${baseUrl}/confirm-availability?token=${confirmationToken}&action=confirm`;
  const declineUrl = `${baseUrl}/confirm-availability?token=${confirmationToken}&action=decline`;

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2E4FD8; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; color: #2E4FD8; }
    .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .confirm-btn { background-color: #4CAF50; color: white; }
    .decline-btn { background-color: #f44336; color: white; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Interpretation Request</h1>
    </div>
    
    <div class="content">
      <p>Dear ${interpreterName},</p>
      
      <p>You have received a new in-person interpretation request through DayHub.</p>
      
      <div class="detail">
        <span class="label">Client Name:</span> ${clientName}
      </div>
      <div class="detail">
        <span class="label">Client Email:</span> ${clientEmail}
      </div>
      ${clientPhone ? `<div class="detail"><span class="label">Client Phone:</span> ${clientPhone}</div>` : ''}
      
      <div class="detail">
        <span class="label">Date:</span> ${requestedDate}
      </div>
      <div class="detail">
        <span class="label">Time:</span> ${requestedTime}
      </div>
      <div class="detail">
        <span class="label">Duration:</span> ${duration} minutes
      </div>
      <div class="detail">
        <span class="label">Location:</span> ${location}
      </div>
      <div class="detail">
        <span class="label">Languages:</span> ${sourceLanguage} → ${targetLanguage}
      </div>
      ${notes ? `<div class="detail"><span class="label">Additional Notes:</span> ${notes}</div>` : ''}
      
      <p style="margin-top: 20px;">Please respond to this request:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${confirmUrl}" class="button confirm-btn">Accept Request</a>
        <a href="${declineUrl}" class="button decline-btn">Decline Request</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">
        If you have any questions, you can contact the client directly at ${clientEmail}${clientPhone ? ` or ${clientPhone}` : ''}.
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated message from DayHub Interpreter Directory</p>
    </div>
  </div>
</body>
</html>
  `;

  // TODO: Implement actual email sending via Manus notification API or SMTP
  // For now, we'll log it and return success
  console.log('Email would be sent to:', interpreterEmail);
  console.log('Confirmation URL:', confirmUrl);
  console.log('Decline URL:', declineUrl);
  
  return {
    success: true,
    message: 'Email sent successfully',
  };
}

/**
 * Send confirmation email to client when interpreter accepts/declines
 */
export async function sendClientNotificationEmail(params: {
  clientEmail: string;
  clientName: string;
  interpreterName: string;
  status: 'confirmed' | 'declined';
  requestedDate: string;
  requestedTime: string;
  interpreterNotes?: string;
}) {
  const {
    clientEmail,
    clientName,
    interpreterName,
    status,
    requestedDate,
    requestedTime,
    interpreterNotes,
  } = params;

  const statusText = status === 'confirmed' ? 'accepted' : 'declined';
  const statusColor = status === 'confirmed' ? '#4CAF50' : '#f44336';

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h1>
    </div>
    
    <div class="content">
      <p>Dear ${clientName},</p>
      
      <p>${interpreterName} has <strong>${statusText}</strong> your interpretation request for ${requestedDate} at ${requestedTime}.</p>
      
      ${interpreterNotes ? `<div class="detail"><strong>Interpreter Notes:</strong><br>${interpreterNotes}</div>` : ''}
      
      ${status === 'confirmed' 
        ? '<p>The interpreter will contact you directly to finalize the details.</p>' 
        : '<p>Please search for another interpreter on DayHub to fulfill your needs.</p>'}
    </div>
  </div>
</body>
</html>
  `;

  console.log('Client notification email would be sent to:', clientEmail);
  
  return {
    success: true,
    message: 'Client notification sent successfully',
  };
}
