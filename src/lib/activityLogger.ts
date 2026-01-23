import { supabase } from '@/integrations/supabase/client';

interface ActivityLog {
  entityType: 'lead' | 'deal' | 'quotation' | 'invoice' | 'product';
  entityId: string;
  action: string;
  description: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  userId?: string | null;
  userName?: string | null;
}

export async function logActivity({
  entityType,
  entityId,
  action,
  description,
  oldValue,
  newValue,
  userId,
  userName,
}: ActivityLog): Promise<void> {
  try {
    const { error } = await supabase.from('activities').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      description,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      performed_by: userId || null,
      performed_by_name: userName || null,
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

export function formatActivityDescription(
  action: string,
  entityType: string,
  details?: Record<string, unknown>
): string {
  switch (action) {
    case 'created':
      return `${capitalize(entityType)} created`;
    case 'updated':
      return `${capitalize(entityType)} updated`;
    case 'deleted':
      return `${capitalize(entityType)} deleted`;
    case 'status_changed':
      return details?.oldStatus && details?.newStatus
        ? `Status changed: ${details.oldStatus} → ${details.newStatus}`
        : `Status changed`;
    case 'stage_changed':
      return details?.oldStage && details?.newStage
        ? `Stage changed: ${details.oldStage} → ${details.newStage}`
        : `Stage changed`;
    case 'email_sent':
      return `Email sent to ${details?.recipient || 'recipient'}`;
    case 'payment_recorded':
      return `Payment of ${details?.amount || '0'} recorded`;
    case 'locked':
      return `${capitalize(entityType)} locked`;
    case 'unlocked':
      return `${capitalize(entityType)} unlocked`;
    case 'qualified':
      return 'Lead qualified to deal';
    case 'converted':
      return `Converted to ${details?.targetType || 'document'}`;
    case 'stock_updated':
      return details?.oldStock !== undefined && details?.newStock !== undefined
        ? `Stock updated: ${details.oldStock} → ${details.newStock}`
        : 'Stock updated';
    default:
      return action;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = 'Rupees ' + numToWords(rupees);
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  result += ' Only';
  
  return result;
}
