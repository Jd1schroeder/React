export const workOrderSortGroups = [
  {
    id: 'creation',
    label: 'Creation Date',
    options: [
      { id: 'created-oldest', label: 'Oldest First' },
      { id: 'created-newest', label: 'Newest First' },
    ],
  },
  {
    id: 'due',
    label: 'Due Date',
    options: [
      { id: 'due-earliest', label: 'Earliest First' },
      { id: 'due-latest', label: 'Latest First' },
    ],
  },
  {
    id: 'updated',
    label: 'Last Updated',
    options: [
      { id: 'updated-oldest', label: 'Least Recent First' },
      { id: 'updated-newest', label: 'Most Recent First' },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    options: [
      { id: 'priority-highest', label: 'Highest First' },
      { id: 'priority-lowest', label: 'Lowest First' },
    ],
  },
]
