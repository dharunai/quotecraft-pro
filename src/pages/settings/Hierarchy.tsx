import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Plus, Trash2, Save, User as UserIcon, Building2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
interface Department {
    id: string;
    name: string;
    description: string | null;
    manager_id: string | null;
    is_active: boolean;
}

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    position: string | null;
    department_id: string | null;
    reports_to: string | null;
    can_assign_tasks: boolean;
    can_view_all_tasks: boolean;
}

// --- Components ---

const ManageMembersDialog = ({ department, profiles, isOpen, onClose }: { department: Department, profiles: Profile[], isOpen: boolean, onClose: () => void }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Initial state: Users currently in this department
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            const currentMembers = profiles.filter(p => p.department_id === department.id).map(p => p.id);
            setSelectedUserIds(new Set(currentMembers));
        }
    }, [isOpen, department.id, profiles]);

    const updateMembersMutation = useMutation({
        mutationFn: async () => {
            const currentMembers = new Set(profiles.filter(p => p.department_id === department.id).map(p => p.id));
            const newMembers = selectedUserIds;

            const toAdd = [...newMembers].filter(id => !currentMembers.has(id));
            const toRemove = [...currentMembers].filter(id => !newMembers.has(id));

            const promises = [];

            if (toAdd.length > 0) {
                // Bulk update for adding
                // Note: 'in' filter is useful but Supabase JS client 'update' usually expects one match or all? 
                // Actually update().in() works for bulk updates with same value.
                promises.push(
                    supabase.from('profiles').update({ department_id: department.id }).in('id', toAdd)
                );
            }

            if (toRemove.length > 0) {
                promises.push(
                    supabase.from('profiles').update({ department_id: null }).in('id', toRemove)
                );
            }

            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({ title: "Department members updated" });
            onClose();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Members</DialogTitle>
                    <DialogDescription>
                        Select users to assign to <strong>{department.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] p-4 border rounded-md">
                    <div className="space-y-4">
                        {profiles.map(profile => (
                            <div key={profile.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`user-${profile.id}`}
                                    checked={selectedUserIds.has(profile.id)}
                                    onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedUserIds);
                                        if (checked) newSet.add(profile.id);
                                        else newSet.delete(profile.id);
                                        setSelectedUserIds(newSet);
                                    }}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor={`user-${profile.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {profile.full_name || profile.email}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {profile.position || 'No Title'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => updateMembersMutation.mutate()} disabled={updateMembersMutation.isPending}>
                        {updateMembersMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const DepartmentsTab = ({ profiles }: { profiles: Profile[] }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newDeptName, setNewDeptName] = useState('');
    const [managingDept, setManagingDept] = useState<Department | null>(null);

    const { data: departments, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            return data as Department[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            // Need to get company_id? For now we can assume the user's company or handled by trigger/RLS if applicable. 
            // But the migration has company_id as NOT NULL.
            // We'll likely need to fetch the current user's company_id or use a default if it's single tenant logic for now. 
            // Assuming existing app logic for company_id. 
            // Wait, standard supabase approach here often implies we get it from auth metadata or just insert and let RLS handle it if setup?
            // The migration had `company_id UUID NOT NULL`. I need to provide it. 
            // Let's fetch the current user's user_id and maybe there's a company link?
            // Looking at `add_join_company_flow.sql`, we usually have a company_id in profiles or metadata.
            // Let's check session.

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // Fetch company_id from profile
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

            if (!profile?.company_id) throw new Error('No company ID found for user');

            const { error } = await supabase.from('departments').insert({
                name,
                company_id: profile.company_id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            setNewDeptName('');
            toast({ title: "Department created" });
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (dept: Partial<Department> & { id: string }) => {
            const { error } = await supabase.from('departments').update(dept).eq('id', dept.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast({ title: "Department updated" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('departments').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast({ title: "Department deleted" });
        }
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>Manage your company departments and assigning managers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <Input
                            placeholder="New Department Name"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                        />
                        <Button onClick={() => createMutation.mutate(newDeptName)} disabled={!newDeptName.trim()}>
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {departments?.map((dept) => (
                            <div key={dept.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                                <div className="flex-1 space-y-2">
                                    <Input
                                        defaultValue={dept.name}
                                        onBlur={(e) => {
                                            if (e.target.value !== dept.name) {
                                                updateMutation.mutate({ id: dept.id, name: e.target.value });
                                            }
                                        }}
                                        className="font-medium"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={dept.manager_id || "unassigned"}
                                            onValueChange={(val) => updateMutation.mutate({ id: dept.id, manager_id: val === "unassigned" ? null : val })}
                                        >
                                            <SelectTrigger className="w-[200px] h-8 text-xs">
                                                <SelectValue placeholder="Select Manager" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">No Manager</SelectItem>
                                                {profiles?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setManagingDept(dept)} title="Manage Members">
                                    <Users className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(dept.id)} title="Delete Department">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {managingDept && (
                        <ManageMembersDialog
                            department={managingDept}
                            profiles={profiles}
                            isOpen={!!managingDept}
                            onClose={() => setManagingDept(null)}
                        />
                    )}
                </CardContent>
            </Card>
        </div >
    );
};

const OrgChartTab = ({ profiles }: { profiles: Profile[] }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Simple layout: Owner -> Managers -> Employees
    // Using React Flow
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const onConnect = useCallback(
        async (params: Connection) => {
            // Source is Manager, Target is Subordinate
            // Edge direction: Manager -> Employee
            if (!params.source || !params.target) return;

            // Prevent self-connection
            if (params.source === params.target) return;

            // Optimistic update (visual only, real update comes from query refresh)
            setEdges((eds) => addEdge(params, eds));

            const { error } = await supabase
                .from('profiles')
                .update({ reports_to: params.source })
                .eq('id', params.target);

            if (error) {
                toast({ title: "Error", description: "Failed to update reporting line", variant: "destructive" });
                // Revert edge if needed, but query validation will fix it
            } else {
                toast({ title: "Reporting line updated", description: "User now reports to the selected manager." });
                queryClient.invalidateQueries({ queryKey: ['profiles'] });
            }
        },
        [setEdges, toast, queryClient]
    );

    useEffect(() => {
        if (!profiles) return;

        // Build the tree
        const newNodes = profiles.map((p, index) => ({
            id: p.id,
            position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 100 }, // Extremely Naive layout
            data: { label: p.full_name || p.email },
            type: 'default', // or custom
            draggable: true
        }));

        const newEdges = profiles
            .filter(p => p.reports_to)
            .map(p => ({
                id: `e-${p.reports_to}-${p.id}`,
                source: p.reports_to!,
                target: p.id,
                type: 'smoothstep',
                animated: true
            }));

        // Better layout algorithm would be nice, but for now simple grid
        // Actually let's try to group by hierarchy
        const levels: Record<string, number> = {}; // id -> level

        // Naive level calculation (should limit recursion depth in real app)
        const getLevel = (id: string, depth = 0): number => {
            if (depth > 10) return 10;
            const p = profiles.find(x => x.id === id);
            if (!p || !p.reports_to) return 0;
            return 1 + getLevel(p.reports_to, depth + 1);
        };

        const nodesWithPos = profiles.map(p => {
            const level = getLevel(p.id);
            // Group nodes at the same level
            const siblings = profiles.filter(x => getLevel(x.id) === level);
            const index = siblings.findIndex(x => x.id === p.id);

            return {
                id: p.id,
                position: { x: index * 200, y: level * 150 + 50 },
                data: {
                    label: (
                        <div className="p-2 text-center">
                            <div className="font-bold">{p.full_name || p.email}</div>
                            <div className="text-xs text-muted-foreground">{p.position || 'No Title'}</div>
                        </div>
                    )
                },
                className: 'bg-card border-primary/20 shadow-sm min-w-[150px]'
            };
        });

        setNodes(nodesWithPos);
        setEdges(newEdges);

    }, [profiles, setNodes, setEdges]);

    return (
        <Card className="h-[600px]">
            <CardContent className="h-full p-0">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </CardContent>
        </Card>
    );
};

const PermissionsTab = ({ profiles }: { profiles: Profile[] }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const updateProfileMutation = useMutation({
        mutationFn: async (variables: { id: string, updates: Partial<Profile> }) => {
            const { error } = await supabase.from('profiles').update(variables.updates).eq('id', variables.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({ title: "Profile updated" });
        }
    });

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data } = await supabase.from('departments').select('id, name');
            return data;
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Team Permissions & Roles</CardTitle>
                <CardDescription>Configure reporting lines and task permissions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {profiles?.map(profile => (
                        <div key={profile.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg items-start md:items-center">
                            <div className="flex-1">
                                <div className="font-medium">{profile.full_name || profile.email}</div>
                                <div className="text-sm text-muted-foreground">{profile.email}</div>
                            </div>

                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <Label className="text-xs text-muted-foreground">Job Title</Label>
                                <Input
                                    className="h-8 max-w-[200px]"
                                    defaultValue={profile.position || ''}
                                    onBlur={(e) => {
                                        if (e.target.value !== profile.position) {
                                            updateProfileMutation.mutate({ id: profile.id, updates: { position: e.target.value } });
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <Label className="text-xs text-muted-foreground">Department</Label>
                                <Select
                                    value={profile.department_id || "none"}
                                    onValueChange={(val) => updateProfileMutation.mutate({ id: profile.id, updates: { department_id: val === "none" ? null : val } })}
                                >
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {departments?.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <Label className="text-xs text-muted-foreground">Reports To</Label>
                                <Select
                                    value={profile.reports_to || "none"}
                                    onValueChange={(val) => updateProfileMutation.mutate({ id: profile.id, updates: { reports_to: val === "none" ? null : val } })}
                                >
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Self / None</SelectItem>
                                        {profiles.filter(p => p.id !== profile.id).map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4 border-l pl-4">
                                <div className="flex flex-col items-center gap-1">
                                    <Label className="text-[10px] text-muted-foreground">Assign Tasks</Label>
                                    <Switch
                                        checked={profile.can_assign_tasks}
                                        onCheckedChange={(checked) => updateProfileMutation.mutate({ id: profile.id, updates: { can_assign_tasks: checked } })}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Label className="text-[10px] text-muted-foreground">View All</Label>
                                    <Switch
                                        checked={profile.can_view_all_tasks}
                                        onCheckedChange={(checked) => updateProfileMutation.mutate({ id: profile.id, updates: { can_view_all_tasks: checked } })}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default function Hierarchy() {
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            return data as Profile[];
        }
    });

    if (isLoading) return (
        <AppLayout>
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Company Hierarchy</h1>
                    <p className="text-muted-foreground">
                        Manage departments, reporting lines, and team structure.
                    </p>
                </div>

                <Tabs defaultValue="chart">
                    <TabsList>
                        <TabsTrigger value="chart" className="gap-2"><Building2 className="h-4 w-4" /> Org Chart</TabsTrigger>
                        <TabsTrigger value="departments" className="gap-2"><Building2 className="h-4 w-4" /> Departments</TabsTrigger>
                        <TabsTrigger value="permissions" className="gap-2"><UserIcon className="h-4 w-4" /> Members & Permissions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chart" className="mt-6">
                        <OrgChartTab profiles={profiles || []} />
                    </TabsContent>

                    <TabsContent value="departments" className="mt-6">
                        <DepartmentsTab profiles={profiles || []} />
                    </TabsContent>

                    <TabsContent value="permissions" className="mt-6">
                        <PermissionsTab profiles={profiles || []} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
