import { useState } from 'react'
import type { ToolModelMessage } from 'ai'
import { Bolt, Bot, MoveRight, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAgent } from '@/hooks/useAgent'

export default function Home() {
  const [useInput, setUserInput] = useState('')
  const disabled = useInput.trim().length === 0

  const { agent, pendingResolveData, messageList, state } = useAgent()
  // @ts-expect-error just for testing
  window.agent = agent.current

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
                  <pre className='overflow-auto break-words whitespace-normal'>
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
                  <pre className='overflow-auto break-words whitespace-normal'>
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
                  <pre className='overflow-auto break-words whitespace-normal'>
                    {JSON.stringify(message.content, null, 2)}
                  </pre>
                </div>
              )
            }
          }
        })}
        <div>agent state: {state} </div>
        {pendingResolveData && (
          <div>
            <div>待审核内容：</div>
            <div>{JSON.stringify(pendingResolveData, null, 2)}</div>
            <div className='mt-2 flex gap-2'>
              <button
                className='rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700'
                onClick={() => {
                  agent.current.resolveTask()
                }}
              >
                通过
              </button>
              <button
                className='rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700'
                onClick={() => {
                  agent.current.rejectTask()
                }}
              >
                拒绝
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
