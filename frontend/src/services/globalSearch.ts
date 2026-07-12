import { fetchEmployees, type EmployeeRecord } from './employees';
import { fetchMyLeaves, fetchAllLeaves, LEAVE_TYPE_LABELS, type LeaveRecord } from './leaves';

export type EmployeeSearchResult = {
  kind: 'employee';
  id: number;
  title: string;
  subtitle: string;
};

export type LeaveSearchResult = {
  kind: 'leave';
  id: number;
  title: string;
  subtitle: string;
  status: LeaveRecord['status'];
};

export type SearchResults = {
  employees: EmployeeSearchResult[];
  leaves: LeaveSearchResult[];
};

const MAX_RESULTS_PER_CATEGORY = 5;

function employeeToResult(employee: EmployeeRecord): EmployeeSearchResult {
  return {
    kind: 'employee',
    id: employee.id,
    title: employee.full_name,
    subtitle: [employee.department, employee.designation].filter(Boolean).join(' · ') || employee.email,
  };
}

const ALL_LEAVE_TYPES: LeaveRecord['leave_type'][] = [
  'casual',
  'sick',
  'annual',
  'wedding',
  'family_emergency',
  'personal',
  'other',
];

function findMatchingLeaveTypes(query: string): LeaveRecord['leave_type'][] {
  return ALL_LEAVE_TYPES.filter((type) => {
    const typeKeyWords = type.replace('_', ' ');
    const typeLabel = LEAVE_TYPE_LABELS[type].toLowerCase();
    return typeKeyWords.includes(query) || typeLabel.includes(query);
  });
}

function filterLeavesByQuery(leaves: LeaveRecord[], query: string): LeaveRecord[] {
  const matchingTypes = findMatchingLeaveTypes(query);

  if (matchingTypes.length > 0) {
    // Query names a specific leave type (e.g. "sick", "casual") — show only that type,
    // don't mix in unrelated leaves that merely happen to mention the word in their reason.
    return leaves.filter((leave) => matchingTypes.includes(leave.leave_type));
  }

  // Otherwise, treat it as a free-text search over the reason and status fields.
  return leaves.filter((leave) => {
    const haystack = `${leave.reason} ${leave.status}`.toLowerCase();
    return haystack.includes(query);
  });
}

function leaveToResult(leave: LeaveRecord): LeaveSearchResult {
  return {
    kind: 'leave',
    id: leave.id,
    title: LEAVE_TYPE_LABELS[leave.leave_type],
    subtitle: leave.reason,
    status: leave.status,
  };
}

/**
 * Runs a global search scoped to the current user's role.
 * - Superusers (HR): search across all employees and all leave requests.
 * - Regular employees: search only their own leave history (no employee directory access).
 */
export async function runGlobalSearch(query: string, isSuperuser: boolean): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { employees: [], leaves: [] };
  }

  const normalized = trimmed.toLowerCase();
  const matchesKnownType = findMatchingLeaveTypes(normalized).length > 0;

  if (isSuperuser) {
    const [employeesPage, allLeaves] = await Promise.all([
      fetchEmployees({ search: trimmed, limit: MAX_RESULTS_PER_CATEGORY }),
      // If the query names a leave type (e.g. "sick"), fetch a broad, recent page and
      // filter by exact type client-side. Otherwise let the backend do the real text
      // search, so results aren't limited to whatever page happens to be fetched.
      matchesKnownType ? fetchAllLeaves({}) : fetchAllLeaves({ search: trimmed }),
    ]);

    const matchingLeaves = filterLeavesByQuery(allLeaves, normalized)
      .slice(0, MAX_RESULTS_PER_CATEGORY)
      .map(leaveToResult);

    return {
      employees: employeesPage.items.map(employeeToResult),
      leaves: matchingLeaves,
    };
  }

  const myLeaves = matchesKnownType ? await fetchMyLeaves({}) : await fetchMyLeaves({ search: trimmed });
  const matchingLeaves = filterLeavesByQuery(myLeaves, normalized)
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map(leaveToResult);

  return {
    employees: [],
    leaves: matchingLeaves,
  };
}
