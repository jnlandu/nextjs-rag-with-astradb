'use client'

import Image from 'next/image'
import f1GPTLogo from './assets/f1GPTLogo.png'

import { useChat } from 'ai/react'
import { Message } from 'ai'
import PrompSuggestionsRow from './components/PrompSuggestionsRow'
import LoadingBubble from './components/LoadingBubble'
import Bubble from './components/Bubble'


const Home = () =>{
    const { append, handleInputChange,isLoading, messages, handleSubmit, input } = useChat()
    
    const noMessages = !messages || messages.length === 0
    
    const handlePrompt = ({prompText}: any) =>{
        const msg: Message = {
            id: crypto.randomUUID(),
            content: prompText,
            role: "user"
        }
        append(msg)
    }
    return (
        <main>
            <Image src={f1GPTLogo} alt="F1 GPT Logo"  width="200" />
             <section className={noMessages ? "": "populated"}>
                {noMessages ? (
                    <>
                      <p className='starter-text'>
                        The Ultimate place for Formula One super fans!
                        Ask F1GPT anything about the fantastic topic of Formula One racing and
                        it will come back with the most up-to-date answers.
                        We hope you enjoy!
                      </p>
                      <br/>

                     <PrompSuggestionsRow onPromptClick={handlePrompt} />
                    </>   
                ):(
                    <>
                    {messages.map((message: Message, index: number) => (
                        <Bubble key={`message-${index}`} message={message} />
                    ))}
         
                     { isLoading && <LoadingBubble />}
                    </>
                )}
             </section>
              <form onSubmit={handleSubmit}>
                    <input className='question-box' onChange={handleInputChange}
                    value ={input} placeholder='Ask me anything about Formula One!' />
                    <input type='submit' />

                </form>
        </main>
    )

}

export default Home