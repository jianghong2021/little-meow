import markdownit from 'markdown-it'

const md = markdownit();

const res = md.render('# hello');

console.log(res)