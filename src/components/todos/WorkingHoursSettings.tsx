import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const workingHoursSchema = z.object({
  working_days: z.array(z.number()).min(1, 'Select at least one working day'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  timezone: z.string(),
  new_holiday: z.string().optional()
});

const daysOfWeek = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' }
];

export const WorkingHoursSettings: React.FC = () => {
  const { workingHours, loading, saveWorkingHours } = useWorkingHours();
  const [open, setOpen] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);

  const form = useForm({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      working_days: [1, 2, 3, 4, 5],
      start_time: '09:00',
      end_time: '18:00',
      timezone: 'UTC',
      new_holiday: ''
    }
  });

  React.useEffect(() => {
    if (workingHours && open) {
      form.reset({
        working_days: workingHours.working_days,
        start_time: workingHours.start_time,
        end_time: workingHours.end_time,
        timezone: workingHours.timezone,
        new_holiday: ''
      });
      setHolidays(workingHours.custom_holidays || []);
    }
  }, [workingHours, open, form]);

  const onSubmit = async (values: any) => {
    await saveWorkingHours({
      working_days: values.working_days,
      start_time: values.start_time,
      end_time: values.end_time,
      timezone: values.timezone,
      custom_holidays: holidays
    });
    setOpen(false);
  };

  const addHoliday = () => {
    const newHoliday = form.getValues('new_holiday');
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday]);
      form.setValue('new_holiday', '');
    }
  };

  const removeHoliday = (holiday: string) => {
    setHolidays(holidays.filter(h => h !== holiday));
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Working Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Working Hours & Off-Days Settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="working_days"
              render={() => (
                <FormItem>
                  <FormLabel>Working Days</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {daysOfWeek.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name="working_days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day.id}
                              className="flex flex-row items-start space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, day.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== day.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {day.short}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Custom Holidays</FormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="new_holiday"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          type="date" 
                          placeholder="Add holiday date"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="button" onClick={addHoliday} size="sm">
                  Add
                </Button>
              </div>
              
              {holidays.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {holidays.map((holiday) => (
                    <Badge key={holiday} variant="secondary" className="text-xs">
                      {new Date(holiday).toLocaleDateString()}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeHoliday(holiday)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Settings</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};