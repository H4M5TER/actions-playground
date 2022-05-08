const [owner, reponame] = context.payload.repository.full_name.split('/')
const repo = {
  owner: owner,
  repo: reponame
}
const issue = context.payload.issue
console.log(issue)
if (issue.labels.find(v => v.name === 'plan'))
  return
const { data } = await github.rest.issues.listForRepo({
  ...repo,
  creator: 'H4M5TER',
  milestone: context.payload.milestone.number,
  labels: 'plan'
})
console.log(data)
if (data.length !== 1) {
  console.log('no or more than one plan')
  return
}
const plan = data[0]
const [, above, backlog, below = ''] = plan.body.match(/(.+## Backlog\s+)((?:- [^-\r\n]+\r?\n)*)(.*)/s) // assume there is linebreak after list
console.log('above: ', JSON.stringify(above), '\nbacklog: ', JSON.stringify(backlog), '\nbelow: ', JSON.stringify(below))
const action = context.payload.action
let new_backlog = backlog
if (action === 'demilestoned') {
  if (backlog.match(`/- \[[ x]\] #${issue.number}/g`)) {
    console.log('removed')
    new_backlog = backlog.replace(new RegExp(`/^- \[[ x]\] #${issue.number}/`), '')
  } // else do nothing
} else {
  if (!new_backlog.includes(`#${issue.number}`)) {
    const backlogs = backlog.split('\n')
    const newline = `- [${issue.open ? ' ' : 'x'}] #${issue.number}\n`
    console.log('backlogs:\n', backlogs, '\nnewline', newline)
    const id = backlogs.findIndex((v) => {
      if (parseInt(v.match(/#\d+/g) > issue.number))
        return true
    })
    if (id === -1) {
      backlogs.push(newline)
      console.log('appended to the end')
    } else {
      backlogs[id] = newline + backlogs[id] // splice have edging case
      console.log('insert before ', id)
    }
    new_backlog = backlogs.join('\n')
  } // else do nothing
}
console.log('new:\n', new_backlog)
const resp = await github.rest.issues.update({
  ...repo,
  issue_number: plan.number,
  body: above + new_backlog + below
})