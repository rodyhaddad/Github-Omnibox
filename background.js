// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var base = 'https://github.com/';
var travisBase = 'https://travis-ci.org/';

var tools = {
  http: function(url) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
  },
  navigate: function(url, fullPath) {
    if (!fullPath)
      url = base + url;
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.update(tab.id, {
        url: url
      });
    });
  },
  my: function(text) {
    return text.match(/my\s+([\w-]+)?/);
  },
  user: function(text) {
    return text.match(/@([\w-]+)/);
  },
  repo: function(text) {
    return text.match(/([\w-]+\/[\w-\.]+)(\s+.+)?/);
  },
  repoAction: function(text) {
    return text.match(/(pulse|wiki|pulls|graphs|network|issues|admin|travis|new pull|new issue|#([0-9]+)|@([\w-]+))/);
  },
  isUrl: function(text) {
    return text.match(/http[s]?:.*/);
  },
  io: function(text) {
    return text.match(/([\w-]+)\.(gh|github)\.(io|com)(\/[\w-]+)?/);
  },
  ioUrl: function(io) {
    var url;
    url = 'http://' + io[1] + '.github.io';
    if (io[4])
      url += io[4];
    return url;
  },
  searchUrl: function(text) {
    return 'search?q=' + text;
  }
};

function setDefault(text, suggest) {
  var type, action, description = 'Go to ';

  if (type = tools.my(text)) {
    suggestMine(type, suggest);
  } else if (type = tools.isUrl(text)) {
    description = 'Go to';
  } else if (type = tools.user(text)) {
    description += 'user';
  } else if (type = tools.repo(text)) {
    suggestActions(type, suggest);
    if (type[2] && (action = tools.repoAction(type[2]))) {
      if (action[2]) {
        description += 'repo issue';
      } else if (action[3]) {
        description += 'repo branch';
      } else {
        if (action[1] === 'travis')
          description += action[1];
        else
          description += 'repo '+action[1];
      }
    } else {
      description += 'repo';
    }
  } else if (type = tools.io(text)) {
    description += 'page';
  } else {
    description = 'Search for';
  }

  chrome.omnibox.setDefaultSuggestion({
    description: description + ': %s'
  });
}

function setSuggestions(text, suggest) {
  suggest([
    {content: text + " one", description: "the first one"},
    {content: text + " number two", description: "the second entry"}
  ]);
}

function suggestActions(repo, suggest) {
  var suggestions = [],
    description = 'Go to ',
    content = base + repo[1] + '/',
    actions = ['pulse','wiki','pulls','graphs','network','issues','admin'];

  for (var i = actions.length - 1; i >= 0; i--) {
    suggestions.push({ description: description + actions[i] + ': ' + repo[1], content: content + actions[i] });
  };
  suggestions.push({ description: 'New pull: ' + repo[1], content: content + 'issues/new' });
  suggestions.push({ description: 'New issue: ' + repo[1], content: content + 'pulls/new' });
  suggestions.push({ description: 'Go to travis: ' + repo[1], content: travisBase + repo[1] });

  suggest(suggestions);
}

function suggestMine(mine, suggest) {
  var suggestions = [],
    description = 'Go to ',
    content = base + repo[1] + '/',
    actions = ['dashboard','settings','notifications','stars'];

  for (var i = actions.length - 1; i >= 0; i--) {
    suggestions.push({ description: description + actions[i] + ': ' + repo[1], content: content + actions[i] });
  };
  suggestions.push({ description: 'New pull: ' + repo[1], content: content + 'issues/new' });
  suggestions.push({ description: 'New issue: ' + repo[1], content: content + 'pulls/new' });
  suggestions.push({ description: 'Go to travis: ' + repo[1], content: travisBase + repo[1] });

  suggest(suggestions);
}

var global = {
  repos: [],
  users: [],
  issues: []
};



function switcher(switches, text) {
  switches.each(function(item){
    var match;
    if (match = text.match(item.pattern))
      item.next(match);
  });
}
var switches = [], mySwitches = [], repoSwitches = [], suggest, repo;
mySwitches.push({ pattern: 'pulls', next: function(match){
  tools.navigate('dashboard/pulls');
}});
mySwitches.push({ pattern: 'issues', next: function(match){
  tools.navigate('dashboard/issues');
}});
mySwitches.push({ pattern: /^dashboard|stars|profile|settings|notifications/, next: function(match){
  tools.navigate(match[0]);
}});
repoSwitches.push({ pattern: /^wiki|pulse|network|graphs|pulls/, next: function(match){
  tools.navigate(repo + '/' + match[0]);
}});
repoSwitches.push({ pattern: /^new (issue|pull)/, next: function(match){
  tools.navigate(repo + match[1] + 's/new');
}});
repoSwitches.push({ pattern: /(@([\w-.]+))?\s*(\/.*)?/, next: function(match){
  var tree = match[2] || 'tree',
      path = match[3] || '';
  tools.navigate(repo + '/' + tree + path);
}});
repoSwitches.push({ pattern: /^issues|#([0-9]+)?/, next: function(match){
  var number = match[1] || '';
  tools.navigate(repo + '/issues/' + number);
}});
repoSwitches.push({ pattern: /^admin|settings/, next: function(match){
  tools.navigate(repo + '/settings');
}});
switches.push({ pattern: /^my\s+(\w+.*)/, next: function(match){
  switcher(mySwitches, match[1]);
}});
switches.push({ pattern: /^@(\w+)/, next: function(match){
  tools.navigate(match[1]);
}});
switches.push({ pattern: /^[\w-]+\/[\S]+/, next: function(match){
  tools.navigate(match);
}});
switches.push({ pattern: /^([\w-]+\/[\S]+)\s(.*)/, next: function(match){
  repo = match[1];
  switcher(repoSwitches, match[2]);
}});
switches.push({ pattern: /^https?:/, next: function(match){
  tools.navigate(match[0], true);
}});
switches.push({ pattern: /.+/, next: function(match){
  tools.navigate(match[1]);
}});

/*chrome.omnibox.onInputStarted.addListener(function(){
  var repo, repos = tools.http('https://github.com/command_bar/repos');

  for (var i = repos.length - 1; i >= 0; i--) {
    repo = {
      content: repos[i].command,
      description: repos[i].description
    };
    global.repos.push(repo);
  };

  // global.users = http('https://github.com/command_bar/users');
  // global.issues = http('https://github.com/command_bar/issues');
});*/

// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    setDefault(text, suggest);

    // setSuggestions(text, suggest);
  });

// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(function(text) {
  var type, action;
  if (type = tools.my(text)) {
    tools.navigate
  } else if (type = tools.isUrl(text)) {
    tools.navigate(text);
  } else if (type = tools.user(text)) {
    tools.navigate(type[1]);
  } else if (type = tools.repo(text)) {
    console.log(type);
    if (type[2] && (action = tools.repoAction(type[2]))) {
      if (action[2]) {
        tools.navigate(type[1] + '/issues/' + action[2]);
      } else if (action[3]) {
        tools.navigate(type[1] + '/tree/' + action[3]);
      } else {
        if (action[1] === 'travis')
          tools.navigate(travisBase + type[1], true);
        else
          tools.navigate(type[1] + '/' + action[1]);
      }
    } else {
      tools.navigate(type[1]);
    }
  } else if (type = tools.io(text)) {
    tools.navigate(tools.ioUrl(type), true);
  } else {
    tools.navigate(tools.searchUrl(text));
  }
});