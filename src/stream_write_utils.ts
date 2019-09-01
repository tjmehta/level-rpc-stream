import { Writable } from 'stream'

export interface ReqData {
  id: string
  op: string
  args: Array<any>
}
export interface EventResData {
  id: string
  event: string
  args: Array<any>
}
export interface ResultResData {
  id: string
  result?: any
}
export interface ErrorResData {
  id: string
  error: Error
}
export type ResData = ResultResData | ErrorResData

export const write = (stream: Writable, chunk: ResData | EventResData) =>
  stream.write(chunk)
export const writeResultChunk = (stream: Writable, id: string, result: any) =>
  write(stream, {
    id,
    result,
  })
export const writeErrorChunk = (stream: Writable, id: string, err: Error) =>
  write(stream, {
    id,
    error: err,
  })
