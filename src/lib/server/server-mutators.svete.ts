import type { CustomMutatorDefs, Transaction } from "@rocicorp/zero"
import type { createMutators } from "../../routes/api/mutators/index.svelte.js"
import type { Schema } from "../../schema.js"

// You can use runes in this file
export function createServerMutators(
  clientMutators: ReturnType<typeof createMutators>,
  authData?: {sub:string}
) {

    function canDelete(tx: Transaction<Schema>){
        // tx has access to the tables
        if (authData && authData.sub === '123456') return true
        return false
    }

  return {
    // Reuse all client mutators
    ...clientMutators,

    // Override mutators
    todo: {
      ...clientMutators.todo,

      delete: async (tx, id: string) => {
        // This will eventually replace permissions in the schema
        if (canDelete(tx)) {
          await clientMutators.todo.remove(tx, id)
        } else {
          // This will show in your server terminal
          console.error('Not Authorized')
          // This will throw
          throw Error('Not Authorized')
        }
      },
    },
    //
  } as const satisfies CustomMutatorDefs
}

export type CreateServerMutators = ReturnType<typeof createServerMutators>
