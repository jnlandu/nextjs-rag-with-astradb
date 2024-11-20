import React from 'react'
import { Message } from 'ai'
  
const Bubble = ({message}: any) => {
  const {content, role} = message
  console.log('Debugging the message in Bubble:', message)
  return (
    <div className={`${role} bubble`}>
        <p>{content}</p>
    </div>
  )
}

export default Bubble