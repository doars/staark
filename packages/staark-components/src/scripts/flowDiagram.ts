// References:
// https://github.com/alyssaxuu/flowy
// https://github.com/jerosoler/Drawflow

import {
  node as n,
  NodeAbstract,
} from '@doars/staark'

// TODO: What about a separate undo function that takes in the old and new state. Then diffs the two and finds what needs to change to get there. This can be written out and stored, and therefore also be applied in reverse to the state.

type Block = {
  id: string,
  type: string,
  content: string,
  position: {
    x: number,
    y: number,
  },
  connections: string[],
}

type State = {
  blocks: Block[],
  selectedBlockId: string | null,
  history: Block[][],
  redoStack: Block[][],
}

const GRID_SIZE = 20

// Utility function to snap to grid
const snapToGrid = (
  position: {
    x: number,
    y: number,
  },
) => ({
  x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
})

// Utility function to find a block by its ID
const findBlockById = (
  blocks: Block[],
  id: string,
) =>
  blocks.find(block => block.id === id)

// Function to render a single block
const renderBlock = (
  block: Block,
  state: State,
  updateState: (newState: Partial<State>) => void,
): NodeAbstract => {
  const isSelected = state.selectedBlockId === block.id

  return n('div', {
    style: {
      position: 'absolute',
      left: block.position.x + 'px',
      top: block.position.y + 'px',
      border: (
        isSelected
          ? '2px solid blue'
          : '1px solid black'
      ),
      padding: '10px',
      cursor: 'pointer',
    },
    dragstart: (
      event: Event,
    ) => {
      (event as DragEvent).dataTransfer?.setData('block-id', block.id)
    },
    click: () => {
      updateState({
        selectedBlockId: block.id,
      })
    },
  }, block.content)
}

// Function to render arrows between blocks
const renderConnections = (
  block: Block,
  state: State,
) => {
  const connections: NodeAbstract[] = []
  for (const connectionId of block.connections) {
    const targetBlock = findBlockById(state.blocks, connectionId)
    if (!targetBlock) {
      continue
    }

    const x1 = block.position.x
    const y1 = block.position.y
    const x2 = targetBlock.position.x
    const y2 = targetBlock.position.y

    connections.push(
      n('line', {
        x1, y1, x2, y2,
        stroke: 'black',
      })
    )
  }
  return connections
}

// Function to render the panel with block options and inspection features
const renderPanel = (
  state: State,
  updateState: (newState: Partial<State>) => void,
): NodeAbstract | null => {
  if (state.selectedBlockId) {
    const selectedBlock = findBlockById(state.blocks, state.selectedBlockId)
    if (!selectedBlock) {
      return null
    }

    return n('div', {
      style: {
        padding: '10px',
        border: '1px solid gray',
      },
    }, [
      n('div', 'Edit Block Content:'),
      n('input', {
        value: selectedBlock.content,
        input: (event) => {
          selectedBlock.content = (event.target as HTMLInputElement).value
          updateState({
            blocks: [
              ...state.blocks,
            ],
          })
        },
      }),
      n('button', {
        click: () => updateState({
          selectedBlockId: null,
        }),
      }, 'Deselect Block')
    ])
  } else {
    return n('div', {
      style: {
        padding: '10px',
        border: '1px solid gray',
      }
    }, [
      n('div', 'Add New Block:'),
      n('button', {
        click: () => {
          const newBlock: Block = {
            id: `block-${state.blocks.length + 1}`,
            type: 'block',
            content: 'New Block',
            position: {
              x: 100,
              y: 100,
            },
            connections: [],
          }
          updateState({
            blocks: [...state.blocks, newBlock],
            history: [...state.history, state.blocks],
          })
        },
      }, 'Add Block')
    ])
  }
}

// Function to render the entire diagram
const renderDiagram = (
  state: State,
  updateState: (newState: Partial<State>) => void,
) => n('div', {
  style: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  dragover: (
    event: Event,
  ) => event.preventDefault(),
  drop: (
    event: Event
  ) => {
    event.preventDefault()
    const blockId = (event as DragEvent).dataTransfer?.getData('block-id')
    if (blockId) {
      const block = findBlockById(state.blocks, blockId)
      if (block) {
        const newPosition = snapToGrid({
          x: (event as DragEvent).clientX,
          y: (event as DragEvent).clientY,
        })
        block.position = newPosition
        updateState({
          blocks: [...state.blocks],
          history: [...state.history, state.blocks],
        })
      }
    }
  },
}, [
  ...state.blocks
    .map(
      block => renderBlock(block, state, updateState)
    )
    .filter(
      block => !!block
    ),
  ...state.blocks.flatMap(
    block => renderConnections(block, state)
  ),
])

// Function to handle undo/redo actions
const handleUndoRedo = (
  state: State,
  updateState: (
    newState: Partial<State>,
  ) => void,
  action: 'undo' | 'redo',
) => {
  if (
    action === 'undo'
    && state.history.length > 0
  ) {
    const previousState = state.history.pop()!
    updateState({
      blocks: previousState,
      redoStack: [...state.redoStack, state.blocks],
    })
  } else if (
    action === 'redo'
    && state.redoStack.length > 0
  ) {
    const nextState = state.redoStack.pop()!
    updateState({
      blocks: nextState,
      history: [...state.history, state.blocks],
    })
  }
}

// Main view function
export default (
  state: State,
  options: Record<string, any>,
) => {
  const updateState = (
    newState: Partial<State>,
  ) => {
    Object.assign(state, newState)
    options.update()
  }

  return n('div', {
    style: {
      display: 'flex',
      height: '100vh',
    },
  }, [
    n('div', {
      style: {
        width: '200px',
        borderRight: '1px solid gray',
        padding: '10px',
      }
    },
      renderPanel(state, updateState) ?? []
    ),
    renderDiagram(state, updateState),
    n('div', { style: { position: 'absolute', top: '10px', right: '10px' } }, [
      n('button', {
        click: () => handleUndoRedo(state, updateState, 'undo'),
      }, 'Undo'),
      n('button', {
        click: () => handleUndoRedo(state, updateState, 'redo'),
      }, 'Redo')
    ])
  ])
}

