import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, CheckSquare, Clock, Calendar, ListTodo } from 'lucide-react';

export default function Tasks() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
                        <p className="text-muted-foreground">
                            Manage your follow-ups and CRM to-dos.
                        </p>
                    </div>
                    <Button disabled>
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-dashed">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <ListTodo className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Coming Soon</CardTitle>
                            <CardDescription>
                                Task management will help you organize follow-ups, reminders, 
                                and to-do items for your leads and deals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                    <span>Create and assign tasks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span>Set due dates and priorities</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>Track overdue items</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-lg text-muted-foreground">Reminders</CardTitle>
                            <CardDescription>
                                Set up automated reminders for important follow-ups.
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
                    <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Task management features are being developed. Check back soon for 
                        powerful task tracking capabilities.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
