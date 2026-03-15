import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress and resize an image before upload.
 * Max width 800px, JPEG quality 0.7 — reduces file size ~70%.
 */
export const compressImage = async (uri: string): Promise<string> => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (error) {
        if (__DEV__) console.warn('Image compression failed, using original:', error);
        return uri; // Fallback to original if compression fails
    }
};
