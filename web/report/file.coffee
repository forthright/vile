# TODO: make modules
#
$ ->
  issues = JSON.parse $(".file--issues-data").attr "data"

  find_issue = (id) ->
    issues.reduce (found, curr) ->
      found = curr if curr.id == id
      found
    , null

  $(".file--issue").each (i1, issue_node) ->
    issue_el = $(issue_node)
    issue_id = issue_el.attr "id"
    issue = find_issue issue_id
    start = issue?.where?.start?.line || 1
    end = issue?.where?.end?.line || start

    issue_el.find(".file--snippet").find("[id*=line-]")
      .each (i2, line) ->
        lineno = Number $(line).attr("id").replace(/^line\-/, "")
        if lineno >= start && lineno <= end
          $(line).addClass "file--issue--highlighted"
