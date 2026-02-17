export const getAvatarUrl = (identifier: string) => {
    // Using 'avataaars' style for the "flat illustration" look requested
    // Added some nice background colors to make them pop
    const style = 'avataaars';
    const backgroundColors = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

    // Simple hash to pick a background color consistently for the same user
    const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bgColor = backgroundColors[hash % backgroundColors.length];

    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(identifier)}&backgroundColor=${bgColor}`;
};
