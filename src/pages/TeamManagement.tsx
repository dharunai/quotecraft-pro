import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Shield, Users, Lock } from 'lucide-react';

export default function TeamManagement() {
    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
                        <p className="text-muted-foreground">
                            Manage your team members and their access levels.
                        </p>
                    </div>
                    <Button disabled>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-dashed">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Coming Soon</CardTitle>
                            <CardDescription>
                                Team management will allow you to invite team members, 
                                assign roles, and control access to different CRM features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    <span>Invite team members via email</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span>Assign admin or user roles</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-primary" />
                                    <span>Control feature access</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                                <Shield className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-lg text-muted-foreground">Role-Based Access</CardTitle>
                            <CardDescription>
                                Control what each team member can see and do.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="secondary" disabled className="w-full">
                                Coming Soon
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-card rounded-lg border border-border p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Team Members</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Team management features are being developed. Currently, user roles 
                        are managed through the database directly.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
