import { StandardSchemaV1 } from "@standard-schema/spec";
import { TableProps } from "antd";
import {
  useForm,
  UseFormOptions,
  UseFormReturn,
  ResolveFormValues,
} from "./useForm";
import {
  keepPreviousData,
  QueryKey,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";

// ============================================================================
// Search Types
// ============================================================================

export interface PaginationProps {
  current: number;
  pageSize: number;
}

export interface SearchProps<TFormValues = unknown> {
  filters: TFormValues;
  pagination: PaginationProps;
}

export interface SearchResult<TData = unknown> {
  data: Array<TData>;
  total: number;
}

// ============================================================================
// Query Options Factory
// ============================================================================

/**
 * The function signature for creating table query options.
 * Takes search props and returns React Query options.
 */
export type TableQueryOptionsFn<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> = (
  props: SearchProps<TFormValues>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => UseQueryOptions<any, TError, SearchResult<TData>, any>;

/**
 * Creates a typed query options function for use with `useTable`.
 * Allows you to define query options in a separate file while maintaining full type safety.
 *
 * @example
 * ```tsx
 * // queries/users.ts
 * const schema = z.object({ search: z.string() });
 * type FilterValues = z.infer<typeof schema>;
 *
 * export const usersQueryOptions = createTableQueryOptions<FilterValues, User[]>()(
 *   (props) => queryOptions({
 *     queryKey: ['users', props.params],
 *     queryFn: () => fetchUsers(props.params),
 *   })
 * );
 *
 * // components/UsersTable.tsx
 * const { tableProps } = useTable({
 *   validator: schema,
 *   queryOptions: usersQueryOptions,
 * });
 * ```
 */
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>() {
  return <TFn extends TableQueryOptionsFn<TFormValues, TData, TError>>(
    fn: TFn,
  ): TFn => fn;
}

// ============================================================================
// Return Type
// ============================================================================

export interface UseTableReturn<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> extends UseFormReturn<TFormValues> {
  tableProps: TableProps<TData>;
  query: UseQueryResult<SearchResult<TData>, TError>;
  filters: TFormValues;
  pagination: PaginationProps & { total: number | undefined };
}

// ============================================================================
// Table-specific Options
// ============================================================================

export interface UseTableSearchOptions<TFormValues, TData> {
  /**
   * A function that fetches data based on form values.
   * Mutually exclusive with `queryOptions`.
   */
  search: (
    props: SearchProps<TFormValues>,
  ) => SearchResult<TData> | Promise<SearchResult<TData>>;
  queryKey?: QueryKey;
  queryOptions?: undefined;
  /**
   * Pagination configuration.
   */
  pagination?: {
    initial?: {
      /** Initial page size. @default 10 */
      pageSize?: number;
      /** Initial page number. @default 1 */
      current?: number;
    };
  };
}

export interface UseTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> {
  /**
   * React Query options for data fetching.
   * The final selected data must be SearchResult<TData>.
   * You can use `select` to transform queryFn result into SearchResult<TData>.
   * Mutually exclusive with `search`.
   *
   * Can be created inline or using `createTableQueryOptions` for colocated definitions.
   */
  queryOptions: TableQueryOptionsFn<TFormValues, TData, TError>;
  search?: undefined;
  /**
   * Pagination configuration.
   */
  pagination?: {
    initial?: {
      /** Initial page size. @default 10 */
      pageSize?: number;
      /** Initial page number. @default 1 */
      current?: number;
    };
  };
}

// ============================================================================
// Combined Options
// ============================================================================

export type UseTableOptions<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
  TData = unknown,
  TError = Error,
> = UseFormOptions<TSchema, ResolveFormValues<TSchema, TFormValues>> &
  (
    | UseTableSearchOptions<ResolveFormValues<TSchema, TFormValues>, TData>
    | UseTableQueryOptions<
      ResolveFormValues<TSchema, TFormValues>,
      TData,
      TError
    >
  );

// ============================================================================
// Implementation
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CURRENT_PAGE = 1;

export function useTable<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
  TData = unknown,
  TError = Error,
>(
  opts: UseTableOptions<TFormValues, TSchema, TData, TError>,
): UseTableReturn<ResolveFormValues<TSchema, TFormValues>, TData, TError> {
  type TResolvedValues = ResolveFormValues<TSchema, TFormValues>;
  const formResult = useForm(opts) as UseFormReturn<TResolvedValues>;
  const simpleQueryKey = useMemo(() => {
    return ["antd-forge-table", Math.random().toString(36).substring(2, 15)];
  }, []);

  const [filters, setFilters] = useState<TResolvedValues>(
    formResult.formProps.initialValues as TResolvedValues,
  );

  const [paginationState, setPaginationState] = useState<PaginationProps>({
    current: opts.pagination?.initial?.current ?? DEFAULT_CURRENT_PAGE,
    pageSize: opts.pagination?.initial?.pageSize ?? DEFAULT_PAGE_SIZE,
  });

  const searchProps: SearchProps<TResolvedValues> = {
    filters: filters,
    pagination: paginationState,
  };

  const tableQueryOptions = opts.queryOptions
    ? opts.queryOptions(searchProps)
    : {
      queryKey: [...(opts.queryKey ?? [simpleQueryKey]), searchProps],
      queryFn: () => opts.search!(searchProps),
      placeholderData: keepPreviousData,
    };

  const query = useQuery(tableQueryOptions);

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPaginationState((prev) => {
      // Reset to page 1 if pageSize changed
      const newPage = pageSize !== prev.pageSize ? 1 : page;
      return { current: newPage, pageSize };
    });
  };

  const onFinish = async (values: TResolvedValues) => {
    setFilters(values);
    // Reset to page 1 when filters change
    setPaginationState((prev) => ({ ...prev, current: 1 }));
    return await opts.onFinish?.(values);
  };

  return {
    ...formResult,
    formProps: {
      ...formResult.formProps,
      onFinish,
    },
    tableProps: {
      dataSource: query.data?.data,
      loading: !query.isFetched,
      pagination: {
        current: paginationState.current,
        pageSize: paginationState.pageSize,
        total: query.data?.total,
        onChange: handlePaginationChange,
      },
    },
    query,
    filters,
    pagination: {
      ...paginationState,
      total: query.data?.total,
    },
  };
}
