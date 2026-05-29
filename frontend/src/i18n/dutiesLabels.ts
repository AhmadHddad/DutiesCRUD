export const dutyLabels = {
  app: {
    title: 'Duties',
    subtitle: 'Shared operational to-do list',
    refreshTooltip: 'Refresh',
    refreshAriaLabel: 'Refresh duties',
    createSectionTitle: 'New duty',
    dutiesSectionTitle: 'Current duties'
  },
  createDutyForm: {
    nameAriaLabel: 'New duty name',
    namePlaceholder: 'Add a duty',
    submitButton: 'Add duty'
  },
  dutiesFilter: {
    placeholder: 'Filter duties by name',
    ariaLabel: 'Filter duties by name'
  },
  dutiesTable: {
    columns: {
      name: 'Duty',
      actions: 'Actions'
    },
    editTooltip: 'Edit',
    deleteTooltip: 'Delete',
    deleteConfirmTitle: 'Delete duty?',
    deleteConfirmOk: 'Delete',
    deleteConfirmCancel: 'Cancel',
    loadingMore: 'Loading more duties...',
    emptyState: 'No duties yet'
  },
  editDutyModal: {
    title: 'Edit duty',
    saveButton: 'Save changes',
    refreshButton: 'Refresh latest',
    nameLabel: 'Duty name',
    nameAriaLabel: 'Duty name',
    loading: 'Loading the latest duty...',
    loadError: 'Unable to load the latest duty.',
    staleConflict: 'This duty changed on the server. The form has been refreshed with the latest value.'
  },
  errors: {
    unexpected: 'An unexpected error occurred.'
  }
} as const;

export function formatLoadedCountLabel(loadedCount: number, total: number): string {
  return `${loadedCount} of ${total} loaded`;
}

export function formatEditDutyAriaLabel(name: string): string {
  return `Edit ${name}`;
}

export function formatDeleteDutyAriaLabel(name: string): string {
  return `Delete ${name}`;
}
