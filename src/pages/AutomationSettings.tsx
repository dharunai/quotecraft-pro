import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Clock, ArrowRight } from 'lucide-react';

export default function AutomationSettings() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Automation Rules</h1>
                    <p className="text-muted-foreground">
                        Automate your business workflows with trigger-based actions.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-dashed">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Coming Soon</CardTitle>
                            <CardDescription>
                                Automation rules will help you streamline your workflow by automatically 
                                performing actions when certain events occur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span>Auto-create deals when leads qualify</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span>Send emails when quotations are accepted</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span>Update deal stages automatically</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                        <CardHeader>
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-lg text-muted-foreground">Scheduled Tasks</CardTitle>
                            <CardDescription>
                                Schedule recurring tasks and reminders to stay on top of your work.
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
                    <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Automation Rules Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Automation features are being developed. Check back soon for powerful 
                        workflow automation capabilities.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
