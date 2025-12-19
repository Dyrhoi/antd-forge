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
// Pagination Mode Types
// ============================================================================

export type PaginationMode = "server" | "client";

// ============================================================================
// Search Types
// ============================================================================

export interface PaginationProps {
  current: number;
  pageSize: number;
}

/**
 * Resolves the pagination type based on mode.
 * - 'server': PaginationProps (current, pageSize)
 * - 'client': undefined (pagination handled by Ant Design table)
 */
export type ResolvePaginationProps<TPaginationMode extends PaginationMode> =
  TPaginationMode extends "client" ? never : PaginationProps;

export interface SearchProps<
  TFormValues = unknown,
  TPaginationMode extends PaginationMode = "server",
> {
  filters: TFormValues;
  pagination: ResolvePaginationProps<TPaginationMode>;
}

export interface SearchResult<TData = unknown> {
  data: Array<TData>;
  total: number;
}

/**
 * Resolves the search return type based on pagination mode.
 * - 'server': SearchResult<TData> (data + total for server-side pagination)
 * - 'client': TData[] (raw array, Ant Design handles pagination from dataSource.length)
 */
export type ResolveSearchResult<
  TData,
  TPaginationMode extends PaginationMode,
> = TPaginationMode extends "client" ? Array<TData> : SearchResult<TData>;

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
  TPaginationMode extends PaginationMode = "server",
> = (
  props: SearchProps<TFormValues, TPaginationMode>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => UseQueryOptions<
  any,
  TError,
  ResolveSearchResult<TData, TPaginationMode>,
  any
>;

/**
 * Configuration options for createTableQueryOptions.
 */
export interface CreateTableQueryOptionsConfig<
  TPaginationMode extends PaginationMode = "server",
> {
  pagination: {
    mode: TPaginationMode;
  };
}

/**
 * Creates a typed query options function for use with `useTable`.
 * Allows you to define query options in a separate file while maintaining full type safety.
 *
 * @example
 * ```tsx
 * // queries/users.ts - Server pagination (default)
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
 * // queries/products.ts - Client pagination
 * export const productsQueryOptions = createTableQueryOptions<FilterValues, Product>({
 *   pagination: { mode: 'client' }
 * })((props) => queryOptions({
 *   queryKey: ['products', props.filters],
 *   queryFn: () => fetchAllProducts(props.filters), // Returns Product[]
 * }));
 *
 * // components/UsersTable.tsx
 * const { tableProps } = useTable({
 *   validator: schema,
 *   queryOptions: usersQueryOptions,
 * });
 * ```
 */
// Overload: with client config
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>(
  config: CreateTableQueryOptionsConfig<"client">,
): <TFn extends TableQueryOptionsFn<TFormValues, TData, TError, "client">>(
  fn: TFn,
) => TFn;

// Overload: with server config
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>(
  config: CreateTableQueryOptionsConfig<"server">,
): <TFn extends TableQueryOptionsFn<TFormValues, TData, TError, "server">>(
  fn: TFn,
) => TFn;

// Overload: no config (defaults to server mode)
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>(): <TFn extends TableQueryOptionsFn<TFormValues, TData, TError, "server">>(
  fn: TFn,
) => TFn;

// Implementation
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>(config?: CreateTableQueryOptionsConfig<PaginationMode>) {
  return <
    TFn extends TableQueryOptionsFn<TFormValues, TData, TError, PaginationMode>,
  >(
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
  TPaginationMode extends PaginationMode = "server",
> extends UseFormReturn<TFormValues> {
  tableProps: TableProps<TData>;
  query: UseQueryResult<ResolveSearchResult<TData, TPaginationMode>, TError>;
  filters: TFormValues;
  pagination: PaginationProps & { total: number | undefined };
}

// ============================================================================
// Table-specific Options
// ============================================================================

export interface UseTableSearchOptions<
  TFormValues,
  TData,
  TPaginationMode extends PaginationMode = "server",
> {
  /**
   * A function that fetches data based on form values.
   * Mutually exclusive with `queryOptions`.
   *
   * For server pagination (default): Return `{ data: TData[], total: number }`
   * For client pagination: Return `TData[]`
   */
  search: (
    props: SearchProps<TFormValues, TPaginationMode>,
  ) =>
    | ResolveSearchResult<TData, TPaginationMode>
    | Promise<ResolveSearchResult<TData, TPaginationMode>>;
  queryKey?: QueryKey;
  queryOptions?: undefined;
  /**
   * Pagination configuration.
   */
  pagination?: {
    /**
     * Pagination mode.
     * - 'server' (default): You handle pagination in your search/queryFn. Returns `{ data, total }`.
     * - 'client': Ant Design handles pagination. Return raw `TData[]`, no pagination props passed.
     */
    mode?: TPaginationMode;
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
  TPaginationMode extends PaginationMode = "server",
> {
  /**
   * React Query options for data fetching.
   * Mutually exclusive with `search`.
   *
   * For server pagination (default): queryFn/select must return `{ data: TData[], total: number }`
   * For client pagination: queryFn/select must return `TData[]`
   *
   * Can be created inline or using `createTableQueryOptions` for colocated definitions.
   */
  queryOptions: TableQueryOptionsFn<
    TFormValues,
    TData,
    TError,
    TPaginationMode
  >;
  search?: undefined;
  /**
   * Pagination configuration.
   */
  pagination?: {
    /**
     * Pagination mode.
     * - 'server' (default): You handle pagination in your search/queryFn. Returns `{ data, total }`.
     * - 'client': Ant Design handles pagination. Return raw `TData[]`, no pagination props passed.
     */
    mode?: TPaginationMode;
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
  TMode extends PaginationMode = "server",
> = UseFormOptions<TSchema, ResolveFormValues<TSchema, TFormValues>> &
  (
    | UseTableSearchOptions<
        ResolveFormValues<TSchema, TFormValues>,
        TData,
        TMode
      >
    | UseTableQueryOptions<
        ResolveFormValues<TSchema, TFormValues>,
        TData,
        TError,
        TMode
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
  TPaginationMode extends PaginationMode = "server",
>(
  opts: UseTableOptions<TFormValues, TSchema, TData, TError, TPaginationMode>,
): UseTableReturn<
  ResolveFormValues<TSchema, TFormValues>,
  TData,
  TError,
  TPaginationMode
> {
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

  const isClientMode = opts.pagination?.mode === "client";

  // For client mode, pagination is never (undefined at runtime)
  // For server mode, pagination contains current/pageSize
  const searchProps = {
    filters: filters,
    pagination: isClientMode ? (undefined as never) : paginationState,
  } as SearchProps<TResolvedValues, TPaginationMode>;

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

  // For client mode, dataSource is the raw array
  // For server mode, dataSource is query.data.data
  const dataSource = isClientMode
    ? (query.data as TData[] | undefined)
    : (query.data as SearchResult<TData> | undefined)?.data;

  // For client mode, total is derived from dataSource length (let Ant Design handle it)
  // For server mode, total comes from the query response
  const total = isClientMode
    ? undefined
    : (query.data as SearchResult<TData> | undefined)?.total;

  return {
    ...formResult,
    formProps: {
      ...formResult.formProps,
      onFinish,
    },
    tableProps: {
      dataSource,
      loading: !query.isFetched,
      pagination: isClientMode
        ? {
            // Client mode: Ant Design handles pagination from dataSource
            pageSize: paginationState.pageSize,
            onChange: handlePaginationChange,
          }
        : {
            current: paginationState.current,
            pageSize: paginationState.pageSize,
            total,
            onChange: handlePaginationChange,
          },
    },
    query: query as UseQueryResult<
      ResolveSearchResult<TData, TPaginationMode>,
      TError
    >,
    filters,
    pagination: {
      ...paginationState,
      total,
    },
  };
}
