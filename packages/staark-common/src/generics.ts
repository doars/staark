export type GenericFunction<DataType, ReturnType> = (
  argument: DataType
) => ReturnType

export type GenericFunctionUnknown = (
) => unknown

/**
 * @deprecated Will be removed in the next major release.
 */
export type GenericObject<DataType> = {
  [key: string]: DataType
}

/**
 * @deprecated Will be removed in the next major release.
 */
export type GenericObjectAny = {
  [key: string]: any
}
