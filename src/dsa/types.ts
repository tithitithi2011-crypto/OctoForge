import type { ProjectSnippet } from './ProjectStoreCollection';

export enum PriorityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export interface TaskItem {
  id: string;
  title: string;
  priority: PriorityLevel;
  deadline: string; // YYYY-MM-DDTHH:mm
  deadlineTimestamp: number;
  status: TaskStatus;
  createdAt: number;
  heapScore: number;
}

export type EditorOperationType =
  | 'INSERT_LINE'
  | 'UPDATE_LINE'
  | 'DELETE_LINE'
  | 'REPLACE_WORD'
  | 'UPDATE_TITLE'
  | 'MOVE_LINE';

export interface EditorCommand {
  id: string;
  type: EditorOperationType;
  lineNumber: number;
  targetLineNumber?: number;
  prevText?: string;
  nextText?: string;
  prevTitle?: string;
  nextTitle?: string;
  prevSnapshot?: string[];
  nextSnapshot?: string[];
  description: string;
  timestamp: string;
}

export interface DeletedTrashItem {
  id: string;
  kind: 'line' | 'task' | 'project';
  label: string;
  lineNumber?: number;
  lineText?: string;
  task?: TaskItem;
  project?: ProjectSnippet;
  deletedAt: string;
}

export type AlertSeverity =
  | 'NOMINAL'
  | 'RESIZE'
  | 'UNDERFLOW'
  | 'NOT_FOUND'
  | 'INVALID';

export interface StatusAlert {
  id: string;
  severity: AlertSeverity;
  structure: string;
  title: string;
  message: string;
  complexity: string;
  timestamp: string;
}

export interface OperationLogEntry {
  id: string;
  structure: string;
  operation: string;
  detail: string;
  complexity: string;
  status: AlertSeverity;
  timestamp: string;
}
