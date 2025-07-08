// src/lib/utils/inviteTemplates.ts
import type { TeamInvite } from '$lib/types/invites';
import { formatRole, getDaysUntilExpiry, formatDate } from './invites';

export interface EmailTemplate {
  subject: string;
  body: string;
}

export function getEmailTemplate(invite: TeamInvite, template: 'casual' | 'formal'): EmailTemplate {
  const templates = {
    casual: {
      subject: `Join us at ${invite.tenantName}! 🚀`,
      body: `Hey${invite.recipientName ? ' ' + invite.recipientName : ''}!

${invite.personalMessage || `I'd love to have you join our team at ${invite.tenantName}.`}

Your invitation details:
🔗 ${invite.shortUrl}
📱 Code: ${invite.code}
👤 Role: ${formatRole(invite.invitedRole)}

Just click the link or enter the code to get started. The invitation expires in ${getDaysUntilExpiry(invite.expiresAt)} days.

See you soon!
${invite.createdBy.name}`,
    },
    
    formal: {
      subject: `Invitation to join ${invite.tenantName}`,
      body: `Dear ${invite.recipientName || 'Team Member'},

${invite.personalMessage || `You have been invited to join ${invite.tenantName} as a ${formatRole(invite.invitedRole)}.`}

To accept this invitation, please use the following:

Invitation Link: ${invite.shortUrl}
Access Code: ${invite.code}

This invitation will expire on ${formatDate(invite.expiresAt)}.

If you have any questions, please don't hesitate to reach out.

Best regards,
${invite.createdBy.name}
${invite.tenantName}`,
    }
  };
  
  return templates[template];
}

export function getSMSTemplate(invite: TeamInvite): string {
  return `${invite.createdBy.name} invited you to join ${invite.tenantName} as ${formatRole(invite.invitedRole)}!

Accept: ${invite.shortUrl}
Code: ${invite.code}

Expires in ${getDaysUntilExpiry(invite.expiresAt)} days.`;
}

export function getWhatsAppTemplate(invite: TeamInvite): string {
  return `🎉 *You're invited to join ${invite.tenantName}!*

${invite.personalMessage ? `_"${invite.personalMessage}"_\n\n` : ''}👤 *Role:* ${formatRole(invite.invitedRole)}
🔗 *Link:* ${invite.shortUrl}
📱 *Code:* ${invite.code}

_Invitation from ${invite.createdBy.name}_
_Expires in ${getDaysUntilExpiry(invite.expiresAt)} days_`;
}

export function getSlackTemplate(invite: TeamInvite): string {
  return `:wave: You've been invited to join *${invite.tenantName}*!

${invite.personalMessage ? `> ${invite.personalMessage}\n` : ''}
*Your invitation details:*
• Role: ${formatRole(invite.invitedRole)}
• Link: ${invite.shortUrl}
• Code: \`${invite.code}\`

_Invitation from ${invite.createdBy.name} • Expires in ${getDaysUntilExpiry(invite.expiresAt)} days_`;
}