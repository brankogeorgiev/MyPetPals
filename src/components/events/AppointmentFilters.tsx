import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Stethoscope, Scissors, Pill, Calendar, Clock, Bell } from 'lucide-react';

export interface FilterState {
  eventType: string | null;
  dateFrom: string;
  dateTo: string;
  remindersOnly: boolean;
}

interface AppointmentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const appointmentTypes = [
  { value: 'vet_visit', label: 'Vet Visit', icon: <Stethoscope className="w-4 h-4" /> },
  { value: 'grooming', label: 'Grooming', icon: <Scissors className="w-4 h-4" /> },
  { value: 'medication', label: 'Medication', icon: <Pill className="w-4 h-4" /> },
  { value: 'general', label: 'General', icon: <Calendar className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Clock className="w-4 h-4" /> },
];

export function AppointmentFilters({ filters, onFiltersChange }: AppointmentFiltersProps) {
  const activeFiltersCount = [
    filters.eventType,
    filters.dateFrom,
    filters.dateTo,
    filters.remindersOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      eventType: null,
      dateFrom: '',
      dateTo: '',
      remindersOnly: false,
    });
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter Appointments</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground">
                  Clear all
                </Button>
              )}
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.eventType || 'all'}
                onValueChange={(value) => updateFilter('eventType', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Reminders Only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="reminders-only" className="cursor-pointer">Reminders only</Label>
              </div>
              <Switch
                id="reminders-only"
                checked={filters.remindersOnly}
                onCheckedChange={(checked) => updateFilter('remindersOnly', checked)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {filters.eventType && (
        <Badge variant="secondary" className="gap-1">
          {appointmentTypes.find(t => t.value === filters.eventType)?.label}
          <button onClick={() => updateFilter('eventType', null)} className="ml-1 hover:bg-muted rounded-full">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      {filters.remindersOnly && (
        <Badge variant="secondary" className="gap-1">
          <Bell className="w-3 h-3" />
          Reminders
          <button onClick={() => updateFilter('remindersOnly', false)} className="ml-1 hover:bg-muted rounded-full">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      {(filters.dateFrom || filters.dateTo) && (
        <Badge variant="secondary" className="gap-1">
          {filters.dateFrom && filters.dateTo 
            ? `${filters.dateFrom} - ${filters.dateTo}`
            : filters.dateFrom 
              ? `From ${filters.dateFrom}`
              : `Until ${filters.dateTo}`
          }
          <button onClick={() => { updateFilter('dateFrom', ''); updateFilter('dateTo', ''); }} className="ml-1 hover:bg-muted rounded-full">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
