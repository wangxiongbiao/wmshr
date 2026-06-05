export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  code: string;
  message: string;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

// common.ts 只放跨 feature 共享的接口外壳类型；员工、考勤、SOP 等领域模型必须继续放在各自 features/*/types.ts。
export type Nullable<T> = T | null;
