import { supabase } from '@/integrations/supabase/client';
import { notifyTaskMentioned } from './taskNotifications';

interface TaskInfo {
    id: string;
    title: string;
}

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    user_id?: string;
}

/**
 * Parses text for @mentions and returns an array of mentioned user IDs.
 * Mentions are assumed to be in the format @Full Name or @email
 */
export async function parseMentions(text: string): Promise<string[]> {
    const mentionRegex = /@\[([^\]]+)\]/g; // Assuming a structured mention like @[User Name]
    const matches = [...text.matchAll(mentionRegex)];
    const mentionNames = matches.map(match => match[1]);

    if (mentionNames.length === 0) return [];

    // Fetch users whose full_name or email matches the mentions
    const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.in.(${mentionNames.map(name => `"${name}"`).join(',')}),email.in.(${mentionNames.map(name => `"${name}"`).join(',')})`);

    return users?.map(u => u.id) || [];
}

/**
 * Sends notifications to users mentioned in a comment
 */
export async function processMentions(
    task: TaskInfo,
    commentText: string,
    commenter: Profile,
    mentionedUserIds: string[]
) {
    if (mentionedUserIds.length === 0) return;

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_id')
        .in('id', mentionedUserIds);

    if (!profiles) return;

    for (const profile of profiles) {
        // Don't notify the commenter themselves
        if (profile.id === commenter.id) continue;

        await notifyTaskMentioned(task, profile as any, commenter as any, commentText);
    }
}
