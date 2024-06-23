export type GenericFunction<DataType, ReturnType> = (
  argument: DataType
) => ReturnType

export type GenericFunctionUnknown = (
) => unknown

export type GenericObject<DataType> = {
  [key: string]: DataType
}

export type GenericObjectAny = {
  [key: string]: any
}
