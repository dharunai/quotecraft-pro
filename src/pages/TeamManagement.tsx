import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Shield, ShieldAlert, ShieldCheck, MoreVertical, Trash2 } from 'lucide-react';
import { TeamMember } from '@/types/database';
import { PermissionGuard } from '@/components/PermissionGuard';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TeamManagement() {
    const queryClient = useQueryClient();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'sales' | 'viewer'>('viewer');

    const { data: members, isLoading } = useQuery({
        queryKey: ['team_members'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as TeamMember[];
        },
    });

    // Mock invite function - in real app would use Supabase Admin API or Edge Function
    const inviteMember = useMutation({
        mutationFn: async () => {
            // Since we don't have backend logic to create auth users yet without Edge Functions,
            // we will simulate the "happy path" by creating the team_member record.
            // NOTE: This will fail RLS if the auth user doesn't exist, but we can't create auth users client-side easily without signup.
            // To make this work for the demo, we'll assume the user creates an account separately, OR we just show a success toast.

            // Real implementation needing Edge Function:
            // await supabase.functions.invoke('invite-user', { body: { email, role, ... } })

            // Simple implementation: Just creating a placeholder record is not enough because user_id is FK.
            // So for this demo, we can only list users. But let's try to simulate.

            toast.info("Invitation feature requires backend integration. In a real app, this would send an email.");
            return null;
        },
        onSuccess: () => {
            setIsInviteOpen(false);
            setInviteEmail('');
            setInviteName('');
        },
    });

    const updateRole = useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            const { error } = await supabase
                .from('team_members')
                .update({ role })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members'] });
            toast.success('Role updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update role: ${error.message}`);
        },
    });

    const removeMember = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team_members'] });
            toast.success('Team member removed');
        },
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="default" className="bg-red-600"><ShieldAlert className="w-3 h-3 mr-1" /> Admin</Badge>;
            case 'sales':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><ShieldCheck className="w-3 h-3 mr-1" /> Sales</Badge>;
            case 'viewer':
                return <Badge variant="outline"><Shield className="w-3 h-3 mr-1" /> Viewer</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <AppLayout>
            <PermissionGuard requireAdmin fallback={<div className="p-8 text-center text-muted-foreground">You do not have permission to view this page.</div>}>
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold font-sans">Team Management</h1>
                            <p className="text-muted-foreground">Manage your team members and their access levels.</p>
                        </div>

                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Invite Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Invite Team Member</DialogTitle>
                                    <DialogDescription>
                                        Send an invitation to a new team member. They will receive an email to set up their account.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Full Name</label>
                                        <Input
                                            placeholder="John Doe"
                                            value={inviteName}
                                            onChange={(e) => setInviteName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email Address</label>
                                        <Input
                                            placeholder="john@example.com"
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                                <SelectItem value="sales">Sales (Edit Access)</SelectItem>
                                                <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                                    <Button onClick={() => inviteMember.mutate()}>Send Invitation</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>
                                Showing {members?.length || 0} active members
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">Loading members...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members?.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{member.full_name}</p>
                                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(member.role)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={member.is_active ? "secondary" : "destructive"} className={member.is_active ? "bg-green-100 text-green-800" : ""}>
                                                        {member.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(member.created_at), 'MMM d, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Manage Access</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => updateRole.mutate({ id: member.id, role: 'admin' })}>
                                                                Make Admin
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => updateRole.mutate({ id: member.id, role: 'sales' })}>
                                                                Make Sales
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => updateRole.mutate({ id: member.id, role: 'viewer' })}>
                                                                Make Viewer
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMember.mutate(member.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove Member
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!members || members.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No team members found. Invite someone to get started.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </PermissionGuard>
        </AppLayout>
    );
}
