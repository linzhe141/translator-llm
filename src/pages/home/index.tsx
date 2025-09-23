import { useRef, useState, useSyncExternalStore } from 'react'
import { Agent } from '@/core/agent'
import type { ToolModelMessage } from 'ai'
import { Bolt, Bot, MoveRight, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'

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
      <div className='my-4'>
        <NavLink
          to='/settings'
          className='flex w-[100px] items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 hover:bg-blue-200'
        >
          <MoveRight className='h-4 w-4 text-blue-500' />
          <span className='text-sm font-medium text-blue-600'>settings</span>
        </NavLink>
      </div>

      <textarea
        className='w-full resize-none rounded-md border border-gray-300 p-2 outline-0 focus:border-blue-700'
        value={useInput}
        onChange={(e) => setUserInput(e.target.value)}
        rows={10}
        placeholder='Write some text you want to translate here...'
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
              const message = i
              return (
                <div
                  key={index}
                  className='my-4 rounded-md border bg-blue-100 p-2'
                >
                  <div>
                    <UserRound />
                  </div>
                  <pre className='overflow-auto break-words'>
                    {message.content as string}
                  </pre>
                </div>
              )
            }
            case 'assistant': {
              const message = i
              return (
                <div className='my-4 rounded-md border bg-blue-500 p-2 text-white'>
                  <div>
                    <Bot></Bot>
                  </div>
                  <pre className='overflow-auto break-words'>
                    {JSON.stringify(message.content, null, 2)}
                  </pre>
                </div>
              )
            }
            case 'tool': {
              const message = i as ToolModelMessage & {
                status: 'approved' | 'rejected' | 'idle'
              }
              return (
                <div className='my-4 rounded-md border bg-[#3c3c3c] p-2 text-white'>
                  <div>
                    <Bolt />
                  </div>
                  <div>
                    status:
                    <span
                      className={`${message.status === 'approved' ? 'text-green-500' : message.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'} ml-4`}
                    >
                      {message.status}
                    </span>
                  </div>
                  <pre className='overflow-auto break-words'>
                    {JSON.stringify(message.content, null, 2)}
                  </pre>
                  {message.status === 'idle' && (
                    <div className='mt-2'>
                      <button
                        className='rounded-md bg-green-500 p-2 text-white'
                        onClick={() => agent.current.resolveTask()}
                      >
                        Approve
                      </button>
                      <button
                        className='ml-4 rounded-md bg-red-500 p-2 text-white'
                        onClick={() => agent.current.rejectTask()}
                      >
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
