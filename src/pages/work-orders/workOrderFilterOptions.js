import {
  CalendarDays,
  CircleArrowDown,
  CircleArrowUp,
  CircleCheck,
  CircleMinus,
  Flag,
  Users,
  Wrench,
} from 'lucide-react'
import { workOrderStatusOptions } from './workOrderStatusOptions'

export const workOrderFilterDefinitions = {
  assigned_to: {
    label: 'Assigned To',
    Icon: Users,
    defaultOperator: 'one_of',
    operators: [['one_of', 'One of'], ['none_of', 'None of'], ['is_empty', 'Is empty'], ['is_not_empty', 'Is not empty']],
    pinned: true,
  },
  status: {
    label: 'Status',
    Icon: CircleCheck,
    defaultOperator: 'one_of',
    operators: [['one_of', 'One of'], ['none_of', 'None of']],
    options: workOrderStatusOptions,
    pinned: true,
  },
  due_date: {
    label: 'Due date',
    Icon: CalendarDays,
    defaultOperator: 'on',
    operators: [['on', 'On'], ['before', 'Before'], ['after', 'After'], ['between', 'Between'], ['is_empty', 'Is empty'], ['is_not_empty', 'Is not empty']],
  },
  start_date: {
    label: 'Start date',
    Icon: CalendarDays,
    defaultOperator: 'on',
    operators: [['on', 'On'], ['before', 'Before'], ['after', 'After'], ['between', 'Between'], ['is_empty', 'Is empty'], ['is_not_empty', 'Is not empty']],
  },
  priority: {
    label: 'Priority',
    Icon: Flag,
    defaultOperator: 'one_of',
    operators: [['one_of', 'One of'], ['none_of', 'None of'], ['is_empty', 'Is empty'], ['is_not_empty', 'Is not empty']],
    options: [
      { value: 'None', label: 'None' },
      { value: 'Low', label: 'Low', Icon: CircleArrowDown, iconTone: 'low' },
      { value: 'Medium', label: 'Medium', Icon: CircleMinus, iconTone: 'medium' },
      { value: 'High', label: 'High', Icon: CircleArrowUp, iconTone: 'high' },
    ],
  },
  work_type: {
    label: 'Work type',
    Icon: Wrench,
    defaultOperator: 'one_of',
    operators: [['one_of', 'One of'], ['none_of', 'None of']],
    options: [{ value: 'reactive', label: 'Reactive' }, { value: 'preventive', label: 'Preventive' }],
  },
}

export const selectableWorkOrderFilterFields = ['due_date', 'priority', 'work_type', 'start_date']
