// import { groq } from '@ai-sdk/groq';
import Groq  from 'groq-sdk';
// import { createGroq } from '@ai-sdk/groq';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { DataAPIClient } from '@datastax/astra-db-ts';



const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION_NAME, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY, 
    HUGGINGFACE_API_KEY,
     } = process.env


    //  const groqClient =  groq()
const groqClient = new Groq({apiKey: GROQ_API_KEY})
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, {namespace: ASTRA_DB_NAMESPACE});


export async function POST(req: Request){
    try{
        const { messages } = await req.json()
        // const latestMessage = messages[messages?.length - 1]
        console.log('Debugging the messages', messages)
        console.log('------------------------------------')
        const latestMessage = messages[messages?.length - 1].content

        let docContext = ''
        // Create an embedding for the latest message:
        console.log('Debugging the latest message:', latestMessage.role)
        console.log('------------------------------------')
        console.log('Debugging the latest message content:', latestMessage)
        console.log('------------------------------------')
        const embedding = await  new HuggingFaceInferenceEmbeddings({
            apiKey: HUGGINGFACE_API_KEY,
            model: "intfloat/multilingual-e5-large",
        })._embed([latestMessage]) // Embed the latest message
        console.log('Debugging the embedding:', embedding)

        // Get the embeddings from the database:
        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION_NAME!)
            const cursor =  collection.find({}, {
                sort: { 
                    $vector: embedding[0]
            },
            limit: 10
            })

            console.log('Debugging the cursor:', cursor)
            const documents  = await cursor.toArray()
            const docsMap = documents?.map((doc: any) => {doc.text})
            docContext = JSON.stringify(docsMap)
            
            } catch(e){
                console.log('Error querrying the database:', e)
                docContext = ''
        }

        const template = {
            role: 'system',
            content: ` You are an AI assistant who knows everything about Forumla One. Use the below context to augment what you know
            about Forumula One racing.
            The context will provide you with the most recent page data from wikipedia,
            the official Formula One website, and other sources.
            If the context doesn't include the information you need to answer based on your existing
            knowledge and don't mention the source of your information or what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            ----------------------
            START CONTEXT
            ${docContext}
            
            END CONTEXT
            ---------------------- 
            QUESTION: ${latestMessage}
            -----------------------
            `
        } 
       const chatCompletion = await groqClient.chat.completions.create({
        messages: [template, ...messages],
        model: 'mixtral-8x7b-32768',
        max_tokens: 1024,
        stream: true
       }) 
       for await (const chunk of chatCompletion){
        return chunk.choices[0].delta?.content || 'error, not streaaming'
       }
    }  
    
}



