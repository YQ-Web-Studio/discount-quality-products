const cleanHtml = (html: string): string => {
  let clean = html;

  // Remove style blocks and their contents
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script blocks and their contents
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Strip bare CSS selector blocks that might leak, e.g. img{max-width:100%}
  clean = clean.replace(/[a-z0-9#.*_,-]+\s*\{\s*[a-z-]+\s*:\s*[^}]+\}/gi, '');

  return clean.trim();
};

const input1 = "This is a product. <style>img{max-width:100%} .red { color: red; }</style> It works.";
const input2 = "Here is some leaked CSS img{max-width:100%} in the description.";

console.log("Input 1 cleaned:", cleanHtml(input1));
console.log("Input 2 cleaned:", cleanHtml(input2));
