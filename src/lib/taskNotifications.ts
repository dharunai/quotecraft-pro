/**
 * Task Email & In-App Notification Service
 * 
 * Sends styled HTML emails via Resend (through backend /api/send-email)
 * and creates in-app notifications using the activities table.
 */

import { sendEmail } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationSystem';
import { supabase } from '@/integrations/supabase/client';

const APP_URL = window.location.origin;

/**
 * Check if task email notifications are enabled in company_settings.
 * Returns false if the setting is off or cannot be determined.
 */
async function isTaskEmailEnabled(): Promise<boolean> {
    try {
        const { data } = await supabase
            .from('company_settings')
            .select('task_email_notifications')
            .limit(1)
            .maybeSingle();
        return (data as any)?.task_email_notifications === true;
    } catch {
        return false;
    }
}

// ─── Email HTML Templates ────────────────────────────────────────────

function baseWrapper(title: string, content: string, accentColor = '#1e293b'): string {
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, ${accentColor} 0%, ${lighten(accentColor)} 100%); padding: 28px 32px;">
    <h1 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 600;">${title}</h1>
  </div>
  <div style="padding: 28px 32px;">
    ${content}
  </div>
  <div style="padding: 14px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8;">Sent via The Genworks CRM</p>
  </div>
</div>`;
}

function lighten(hex: string): string {
    // Simple lighten for gradient — adds ~20% lightness
    const map: Record<string, string> = {
        '#1e293b': '#334155',
        '#2563eb': '#3b82f6',
        '#dc2626': '#ef4444',
        '#16a34a': '#22c55e',
        '#7c3aed': '#8b5cf6',
        '#d97706': '#f59e0b',
    };
    return map[hex] || '#475569';
}

function taskRow(label: string, value: string): string {
    return `
  <tr>
    <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 100px; vertical-align: top; font-weight: 600;">${label}</td>
    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${value}</td>
  </tr>`;
}

function priorityBadge(priority: string): string {
    const colors: Record<string, string> = {
        low: '#64748b',
        medium: '#2563eb',
        high: '#d97706',
        urgent: '#dc2626',
    };
    const color = colors[priority] || '#64748b';
    return `<span style="display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; background: ${color}; text-transform: uppercase;">${priority}</span>`;
}

function ctaButton(text: string, url: string, color = '#1e293b'): string {
    return `
  <div style="text-align: center; padding: 20px 0 8px;">
    <a href="${url}" style="display: inline-block; padding: 10px 28px; background: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">${text}</a>
  </div>`;
}

// ─── Public Template Builders ────────────────────────────────────────

interface TaskInfo {
    id: string;
    title: string;
    description?: string | null;
    priority?: string;
    due_date?: string | null;
    status?: string;
}

export function buildTaskAssignedEmail(task: TaskInfo, assignedByName: string): string {
    const rows = [
        taskRow('Task', `<strong>${task.title}</strong>`),
        task.description ? taskRow('Details', task.description) : '',
        task.priority ? taskRow('Priority', priorityBadge(task.priority)) : '',
        task.due_date ? taskRow('Due Date', new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })) : '',
        taskRow('Assigned By', assignedByName),
    ].join('');

    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">New Task Assigned to You</h2>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    ${ctaButton('View Task', `${APP_URL}/tasks`)}`;

    return baseWrapper('📋 Task Assigned', content, '#2563eb');
}

export function buildTaskDelegatedEmail(task: TaskInfo, delegatedByName: string, reason?: string): string {
    const rows = [
        taskRow('Task', `<strong>${task.title}</strong>`),
        task.priority ? taskRow('Priority', priorityBadge(task.priority)) : '',
        task.due_date ? taskRow('Due Date', new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })) : '',
        taskRow('Delegated By', delegatedByName),
        reason ? taskRow('Reason', reason) : '',
    ].join('');

    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">Task Delegated</h2>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    ${ctaButton('View Task', `${APP_URL}/tasks`, '#7c3aed')}`;

    return baseWrapper('🔀 Task Delegated', content, '#7c3aed');
}

export function buildTaskCompletedEmail(task: TaskInfo, completedByName: string): string {
    const rows = [
        taskRow('Task', `<strong style="text-decoration: line-through;">${task.title}</strong>`),
        taskRow('Completed By', completedByName),
        taskRow('Status', '<span style="color: #16a34a; font-weight: 700;">✓ Completed</span>'),
    ].join('');

    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">Task Completed</h2>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    ${ctaButton('View Tasks', `${APP_URL}/tasks`, '#16a34a')}`;

    return baseWrapper('✅ Task Completed', content, '#16a34a');
}

export function buildTaskDueTodayEmail(task: TaskInfo): string {
    const rows = [
        taskRow('Task', `<strong>${task.title}</strong>`),
        task.priority ? taskRow('Priority', priorityBadge(task.priority)) : '',
        taskRow('Due', '<span style="color: #d97706; font-weight: 700;">Today</span>'),
    ].join('');

    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">Task Due Today</h2>
    <p style="color: #475569; font-size: 14px; margin: 0 0 16px;">This is a reminder that the following task is due today.</p>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    ${ctaButton('View Task', `${APP_URL}/tasks`, '#d97706')}`;

    return baseWrapper('⏰ Due Today Reminder', content, '#d97706');
}

export function buildTaskOverdueEmail(task: TaskInfo): string {
    const rows = [
        taskRow('Task', `<strong>${task.title}</strong>`),
        task.priority ? taskRow('Priority', priorityBadge(task.priority)) : '',
        task.due_date ? taskRow('Due Date', `<span style="color: #dc2626; font-weight: 700;">${new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (Overdue)</span>`) : '',
    ].join('');

    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #dc2626;">OVERDUE Task</h2>
    <p style="color: #475569; font-size: 14px; margin: 0 0 16px;">This task is past its due date. Please take action immediately.</p>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    ${ctaButton('View Task', `${APP_URL}/tasks`, '#dc2626')}`;

    return baseWrapper('🚨 OVERDUE', content, '#dc2626');
}

export function buildTaskMentionedEmail(task: TaskInfo, commenterName: string, commentText: string): string {
    const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a;">${commenterName} mentioned you</h2>
    <div style="background: #f1f5f9; border-left: 3px solid #2563eb; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 0 0 16px;">
      <p style="margin: 0; font-size: 14px; color: #334155;">${commentText}</p>
    </div>
    <p style="color: #64748b; font-size: 13px; margin: 0;">In task: <strong>${task.title}</strong></p>
    ${ctaButton('View Task', `${APP_URL}/tasks`, '#2563eb')}`;

    return baseWrapper(`💬 You were mentioned`, content, '#2563eb');
}

// ─── Send Functions (Email + In-App) ─────────────────────────────────

interface ProfileLike {
    id: string;
    full_name?: string | null;
    email?: string | null;
    user_id?: string;
}

/**
 * Send "Task Assigned" notification - email to assignee + in-app
 */
export async function notifyTaskAssigned(
    task: TaskInfo,
    assignee: ProfileLike,
    assignedBy: ProfileLike,
) {
    const assigneeName = assignee.full_name || assignee.email || 'Team Member';
    const assignerName = assignedBy.full_name || assignedBy.email || 'Someone';

    // Email (only if enabled in settings)
    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && assignee.email) {
        sendEmail({
            to: assignee.email,
            subject: `New Task Assigned: ${task.title}`,
            body: buildTaskAssignedEmail(task, assignerName),
        }).catch(err => console.error('[TaskNotif] Email failed:', err));
    }

    // In-app notification
    createNotification({
        userId: assignee.user_id || assignee.id,
        title: 'Task Assigned',
        message: `"${task.title}" has been assigned to you by ${assignerName}`,
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app failed:', err));
}

/**
 * Send "Task Delegated" notification - email to new assignee AND original
 */
export async function notifyTaskDelegated(
    task: TaskInfo,
    newAssignee: ProfileLike,
    originalAssignee: ProfileLike | null,
    delegatedBy: ProfileLike,
    reason?: string,
) {
    const delegatorName = delegatedBy.full_name || delegatedBy.email || 'Someone';

    // Email (only if enabled in settings)
    const emailEnabled = await isTaskEmailEnabled();

    // Email to new assignee
    if (emailEnabled && newAssignee.email) {
        sendEmail({
            to: newAssignee.email,
            subject: `Task Delegated: ${task.title}`,
            body: buildTaskDelegatedEmail(task, delegatorName, reason),
        }).catch(err => console.error('[TaskNotif] Delegate email failed:', err));
    }

    // Email to original assignee
    if (emailEnabled && originalAssignee?.email) {
        sendEmail({
            to: originalAssignee.email,
            subject: `Task Delegated: ${task.title}`,
            body: buildTaskDelegatedEmail(task, delegatorName, reason),
        }).catch(err => console.error('[TaskNotif] Original assignee email failed:', err));
    }

    // In-app notifications
    createNotification({
        userId: newAssignee.user_id || newAssignee.id,
        title: 'Task Delegated to You',
        message: `"${task.title}" has been delegated to you by ${delegatorName}`,
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app failed:', err));

    if (originalAssignee) {
        createNotification({
            userId: originalAssignee.user_id || originalAssignee.id,
            title: 'Task Delegated',
            message: `"${task.title}" you were assigned has been delegated by ${delegatorName}`,
            category: 'task',
            entityType: 'task',
            entityId: task.id,
        }).catch(err => console.error('[TaskNotif] In-app original failed:', err));
    }
}

/**
 * Send "Task Completed" notification - email to creator
 */
export async function notifyTaskCompleted(
    task: TaskInfo,
    completedBy: ProfileLike,
    creator: ProfileLike | null,
) {
    const completedByName = completedBy.full_name || completedBy.email || 'Someone';

    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && creator?.email) {
        sendEmail({
            to: creator.email,
            subject: `Task Completed: ${task.title}`,
            body: buildTaskCompletedEmail(task, completedByName),
        }).catch(err => console.error('[TaskNotif] Complete email failed:', err));
    }

    if (creator) {
        createNotification({
            userId: creator.user_id || creator.id,
            title: 'Task Completed',
            message: `"${task.title}" has been completed by ${completedByName}`,
            type: 'success',
            category: 'task',
            entityType: 'task',
            entityId: task.id,
        }).catch(err => console.error('[TaskNotif] In-app complete failed:', err));
    }
}

/**
 * Send "Task Reassigned" notification - email to new assignee
 */
export async function notifyTaskReassigned(
    task: TaskInfo,
    newAssignee: ProfileLike,
    reassignedBy: ProfileLike,
) {
    const reassignerName = reassignedBy.full_name || reassignedBy.email || 'Someone';

    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && newAssignee.email) {
        sendEmail({
            to: newAssignee.email,
            subject: `Task Reassigned: ${task.title}`,
            body: buildTaskAssignedEmail(task, reassignerName),
        }).catch(err => console.error('[TaskNotif] Reassign email failed:', err));
    }

    createNotification({
        userId: newAssignee.user_id || newAssignee.id,
        title: 'Task Reassigned',
        message: `"${task.title}" has been reassigned to you by ${reassignerName}`,
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app reassign failed:', err));
}

/**
 * Send Due Today / Overdue reminders (call from a scheduled function or manual trigger)
 */
export async function notifyTaskDueToday(task: TaskInfo, assignee: ProfileLike) {
    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && assignee.email) {
        sendEmail({
            to: assignee.email,
            subject: `Task Due Today: ${task.title}`,
            body: buildTaskDueTodayEmail(task),
        }).catch(err => console.error('[TaskNotif] Due today email failed:', err));
    }

    createNotification({
        userId: assignee.user_id || assignee.id,
        title: 'Task Due Today',
        message: `"${task.title}" is due today`,
        type: 'warning',
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app due today failed:', err));
}

export async function notifyTaskOverdue(task: TaskInfo, assignee: ProfileLike) {
    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && assignee.email) {
        sendEmail({
            to: assignee.email,
            subject: `OVERDUE: ${task.title}`,
            body: buildTaskOverdueEmail(task),
        }).catch(err => console.error('[TaskNotif] Overdue email failed:', err));
    }

    createNotification({
        userId: assignee.user_id || assignee.id,
        title: 'Task Overdue',
        message: `"${task.title}" is overdue!`,
        type: 'error',
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app overdue failed:', err));
}

/**
 * Send "@mention" notification
 */
export async function notifyTaskMentioned(
    task: TaskInfo,
    mentionedUser: ProfileLike,
    commenter: ProfileLike,
    commentText: string,
) {
    const commenterName = commenter.full_name || commenter.email || 'Someone';

    const emailEnabled = await isTaskEmailEnabled();
    if (emailEnabled && mentionedUser.email) {
        sendEmail({
            to: mentionedUser.email,
            subject: `${commenterName} mentioned you in a task`,
            body: buildTaskMentionedEmail(task, commenterName, commentText),
        }).catch(err => console.error('[TaskNotif] Mention email failed:', err));
    }

    createNotification({
        userId: mentionedUser.user_id || mentionedUser.id,
        title: 'Mentioned in Task',
        message: `${commenterName} mentioned you in "${task.title}"`,
        category: 'task',
        entityType: 'task',
        entityId: task.id,
    }).catch(err => console.error('[TaskNotif] In-app mention failed:', err));
}
