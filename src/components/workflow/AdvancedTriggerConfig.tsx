import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Repeat,
  AlertCircle,
  Zap,
  Calendar,
  Globe,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import { WorkflowTriggerConfig } from '@/types/database';

interface AdvancedTriggerConfigProps {
  triggerConfig: WorkflowTriggerConfig;
  onConfigChange: (config: WorkflowTriggerConfig) => void;
}

export function AdvancedTriggerConfig({ triggerConfig, onConfigChange }: AdvancedTriggerConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (updates: Partial<WorkflowTriggerConfig>) => {
    onConfigChange({
      ...triggerConfig,
      ...updates,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Advanced Trigger Configuration
        </CardTitle>
        <CardDescription>
          Configure schedule, webhooks, conditions, and time-based triggers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="schedule" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Webhook</span>
            </TabsTrigger>
            <TabsTrigger value="conditions" className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Conditions</span>
            </TabsTrigger>
            <TabsTrigger value="timing" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timing</span>
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-1">
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">Batch</span>
            </TabsTrigger>
          </TabsList>

          {/* SCHEDULE TRIGGER */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.schedule_enabled || false}
                    onCheckedChange={(checked) => updateConfig({ schedule_enabled: !!checked })}
                  />
                  Enable Schedule Trigger
                </Label>
              </div>

              {triggerConfig.schedule_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <Select 
                      value={triggerConfig.schedule_type || 'once'}
                      onValueChange={(value) => updateConfig({ 
                        schedule_type: value as 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Run Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom Cron</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input 
                      type="time"
                      value={triggerConfig.schedule_time || '09:00'}
                      onChange={(e) => updateConfig({ schedule_time: e.target.value })}
                    />
                  </div>

                  {triggerConfig.schedule_type === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select 
                        value={triggerConfig.schedule_day || 'monday'}
                        onValueChange={(value: any) => updateConfig({ schedule_day: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                          <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {triggerConfig.schedule_type === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Select 
                        value={triggerConfig.schedule_date?.toString() || '1'}
                        onValueChange={(value) => updateConfig({ schedule_date: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Day {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {triggerConfig.schedule_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <Input 
                        placeholder="0 9 * * MON (9 AM every Monday)"
                        value={triggerConfig.schedule_cron || ''}
                        onChange={(e) => updateConfig({ schedule_cron: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: minute hour day month weekday
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ Scheduled triggers run on the specified schedule and generate a workflow execution event.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* WEBHOOK TRIGGER */}
          <TabsContent value="webhook" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.webhook_enabled || false}
                    onCheckedChange={(checked) => updateConfig({ webhook_enabled: !!checked })}
                  />
                  Enable Webhook Trigger
                </Label>
              </div>

              {triggerConfig.webhook_enabled && (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-900">Webhook URL:</p>
                    <div className="flex gap-2">
                      <Input 
                        readOnly
                        value={`${window.location.origin}/api/workflows/webhooks/${triggerConfig.webhook_id || 'pending'}`}
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline">Copy</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret (for validation)</Label>
                    <Input 
                      placeholder="Your webhook secret key"
                      type="password"
                      value={triggerConfig.webhook_secret || ''}
                      onChange={(e) => updateConfig({ webhook_secret: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Content-Type</Label>
                    <Select 
                      value={triggerConfig.webhook_content_type || 'application/json'}
                      onValueChange={(value: any) => updateConfig({ webhook_content_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application/json">JSON</SelectItem>
                        <SelectItem value="application/x-www-form-urlencoded">Form Data</SelectItem>
                        <SelectItem value="text/plain">Plain Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ External systems can POST to this URL to trigger your workflow. Include the secret in the X-Webhook-Secret header.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* CONDITIONS */}
          <TabsContent value="conditions" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.conditions_enabled || false}
                    onCheckedChange={(checked) => updateConfig({ conditions_enabled: !!checked })}
                  />
                  Enable Advanced Conditions
                </Label>
              </div>

              {triggerConfig.conditions_enabled && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Trigger Conditions</Label>
                      <Badge variant="outline">AND Logic</Badge>
                    </div>

                    {(triggerConfig.conditions || []).map((condition, idx) => (
                      <div key={idx} className="flex gap-2 items-end border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Field</Label>
                          <Input 
                            placeholder="e.g., status, amount, company_id"
                            value={condition.field || ''}
                            onChange={(e) => {
                              const newConditions = [...(triggerConfig.conditions || [])];
                              newConditions[idx] = { ...condition, field: e.target.value };
                              updateConfig({ conditions: newConditions });
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Operator</Label>
                          <Select 
                            value={condition.operator || 'equals'}
                            onValueChange={(value: any) => {
                              const newConditions = [...(triggerConfig.conditions || [])];
                              newConditions[idx] = { ...condition, operator: value };
                              updateConfig({ conditions: newConditions });
                            }}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Not Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="in_list">In List</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Value</Label>
                          <Input 
                            placeholder="Value to match"
                            value={condition.value || ''}
                            onChange={(e) => {
                              const newConditions = [...(triggerConfig.conditions || [])];
                              newConditions[idx] = { ...condition, value: e.target.value };
                              updateConfig({ conditions: newConditions });
                            }}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const newConditions = (triggerConfig.conditions || []).filter((_, i) => i !== idx);
                            updateConfig({ conditions: newConditions });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newConditions = [...(triggerConfig.conditions || []), {
                          field: '',
                          operator: 'equals' as const,
                          value: ''
                        }];
                        updateConfig({ conditions: newConditions });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Condition
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ The workflow will only trigger if ALL conditions are met. Use field names from the triggering event data.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* TIME-BASED TRIGGERS */}
          <TabsContent value="timing" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.delay_enabled || false}
                    onCheckedChange={(checked) => updateConfig({ delay_enabled: !!checked })}
                  />
                  Delay Execution
                </Label>
              </div>

              {triggerConfig.delay_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Delay Duration</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        min="1"
                        placeholder="Amount"
                        value={triggerConfig.delay_value || 1}
                        onChange={(e) => updateConfig({ delay_value: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <Select 
                        value={triggerConfig.delay_unit || 'hours'}
                        onValueChange={(value) => updateConfig({ delay_unit: value as 'minutes' | 'hours' | 'days' })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ The workflow will wait {triggerConfig.delay_value} {triggerConfig.delay_unit} after the trigger event before executing.
                    </p>
                  </div>
                </>
              )}

              <div className="pt-4">
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.trigger_on_field_change || false}
                    onCheckedChange={(checked) => updateConfig({ trigger_on_field_change: !!checked })}
                  />
                  Only Trigger on Specific Field Changes
                </Label>
              </div>

              {triggerConfig.trigger_on_field_change && (
                <>
                  <div className="space-y-2">
                    <Label>Watch These Fields</Label>
                    <Input 
                      placeholder="e.g., status,amount,company_id (comma-separated)"
                      value={(triggerConfig.watch_fields || []).join(',')}
                      onChange={(e) => updateConfig({ 
                        watch_fields: e.target.value.split(',').map(f => f.trim()).filter(Boolean)
                      })}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ Only triggers when one of these fields changes. Empty = trigger on any change.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* BATCH TRIGGERS */}
          <TabsContent value="batch" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Checkbox 
                    checked={triggerConfig.batch_enabled || false}
                    onCheckedChange={(checked) => updateConfig({ batch_enabled: !!checked })}
                  />
                  Enable Batch Processing
                </Label>
              </div>

              {triggerConfig.batch_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input 
                      type="number"
                      min="1"
                      placeholder="Number of events to batch"
                      value={triggerConfig.batch_size || 10}
                      onChange={(e) => updateConfig({ batch_size: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Window</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        min="1"
                        placeholder="Time duration"
                        value={triggerConfig.batch_window_value || 5}
                        onChange={(e) => updateConfig({ batch_window_value: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <Select 
                        value={triggerConfig.batch_window_unit || 'minutes'}
                        onValueChange={(value) => updateConfig({ batch_window_unit: value as 'minutes' | 'hours' })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-900">
                      ℹ️ Collects up to {triggerConfig.batch_size} events within {triggerConfig.batch_window_value} {triggerConfig.batch_window_unit}, then runs once. Reduces execution count when processing similar events.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
