declare module 'level' {
  import { LevelUp } from 'levelup'
  import { AbstractLevelDOWN } from 'abstract-leveldown'

  export interface OptsType {
    valueEncoding: string
  }

  export interface Level<K, V> extends LevelUp<AbstractLevelDOWN<K, V>> {}

  export default function level<K, V>(
    path: string,
    opts?: OptsType,
  ): Level<K, V>
}
