import { useRef, useState, useSyncExternalStore } from 'react'
import { Agent } from '@/core/agent'
import type { ToolModelMessage } from 'ai'

export default function Home() {
  const [useInput, setUserInput] = useState('')
  const disabled = useInput.trim().length === 0

  const agent = useRef(new Agent())
  const messageList = useSyncExternalStore(
    agent.current.context.subscribe.bind(agent.current.context),
    agent.current.context.getMessages.bind(agent.current.context)
  )
  console.log('messageList', messageList)
  return (
    <div className='mx-auto my-4 w-[1000px]'>
      <textarea
        className='w-full rounded-md border border-gray-300 p-2 outline-0 focus:border-blue-700'
        value={useInput}
        onChange={(e) => setUserInput(e.target.value)}
        rows={10}
      />
      <button
        disabled={disabled}
        className={`w-full rounded-md border bg-blue-500 p-2 text-white ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-600'
        }`}
        onClick={() => {
          // console.log('useInput', useInput)
          // // navigate('/settings')
          // setContent(originText)
          // mockResponse()
          agent.current.userSubmit({
            content: useInput,
            role: 'user',
          })
        }}
      >
        translate
      </button>

      <div>
        {messageList.map((i, index) => {
          switch (i.role) {
            case 'user': {
              return (
                <div
                  key={index}
                  className='my-4 rounded-md border bg-blue-100 p-2'
                >
                  <div>User</div>
                  <pre>{JSON.stringify(i, null, 2)}</pre>
                </div>
              )
            }
            case 'assistant': {
              return (
                <div>
                  <div>Assistant</div>
                  <pre>{JSON.stringify(i, null, 2)}</pre>
                </div>
              )
            }
            case 'tool': {
              const toolMessage = i as ToolModelMessage & {
                status: 'approved' | 'rejected' | 'idle'
              }
              return (
                <div>
                  <div>Tool</div>
                  <pre>{JSON.stringify(toolMessage, null, 2)}</pre>
                  {toolMessage.status === 'idle' && (
                    <div>
                      <button className='bg-green-500 text-white p-2 rounded-md' onClick={() => agent.current.resolveTask()}>
                        Approve
                      </button>
                      <button className='bg-red-500 text-white p-2 rounded-md' onClick={() => agent.current.rejectTask()}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            }
          }
        })}
      </div>
    </div>
  )
}
