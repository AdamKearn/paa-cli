import { AFF } from './aff_wasm.ts'
import { ImageData } from './image_data.ts'
import * as ImageScript from 'https://deno.land/x/imagescript@1.2.15/mod.ts'
import { encode as PNGEncoder } from 'https://deno.land/x/pngs@0.1.1/mod.ts'
import { parse, format } from 'https://deno.land/std@0.189.0/path/mod.ts'
import args from '../cli/args.ts'

const wasmCode = await Deno.readFile('./src/handlers/images/grad_aff_paa.wasm')
const response = new Response(wasmCode, {
    headers: { 'Content-Type': 'application/wasm' },
})

const aff = new AFF(response)

export const convertImage = async (imagePath: string) => {
    await aff.ready

    try {
        const imageExtension = parse(imagePath).ext
        const imageBytes = await Deno.readFile(imagePath)
        let image, imageData, bytes

        switch (imageExtension) {
            case '.paa':
                imageData = aff.decode(imageBytes)
                bytes = PNGEncoder(
                    new Uint8Array(imageData.data),
                    imageData.width,
                    imageData.height
                )
                break

            default:
                image = await ImageScript.decode(imageBytes)
                imageData = new ImageData(
                    image.bitmap,
                    image.width,
                    image.height
                )
                bytes = aff.encode(imageData)
                break
        }

        const outputPath = format({
            ...parse(imagePath),
            base: '',
            ext: imageExtension == '.paa' ? '.png' : '.paa',
        })

        await Deno.writeFile(outputPath, bytes)

        if (!args.silent) console.log('✅ converted:', imagePath)
    } catch (error) {
        if (!args.silent) {
            console.log(
                '❌ failed to convert:',
                imagePath,
                '\n   reason:',
                error
            )
        }
    }
}
