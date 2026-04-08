import httpx

BASE = 'http://localhost:7860'
c = httpx.Client(base_url=BASE, timeout=15)

# 1. Health check
r = c.get('/health')
print(f'[1] GET /health: {r.status_code} -> {r.json()}')

# 2. Reset easy
r = c.post('/reset', json={'task_difficulty': 'easy'})
data = r.json()
obs = data['observation']
print(f'[2] POST /reset easy: {r.status_code} -> task_id={obs["task_id"]}')

# 3. Step
action = {'action_type': 'add_comment', 'line_number': 3, 'content': 'off by one error here'}
r = c.post('/step', json={'action': action})
step_data = r.json()
print(f'[3] POST /step: {r.status_code} -> reward={step_data["reward"]}, done={step_data["done"]}')

# 4. State
r = c.get('/state')
state = r.json()
print(f'[4] GET /state: {r.status_code} -> task_id={state["task_id"]}, step={state["step"]}')

# 5. Reset medium
r = c.post('/reset', json={'task_difficulty': 'medium'})
data = r.json()
print(f'[5] POST /reset medium: {r.status_code} -> task_id={data["observation"]["task_id"]}')

# 6. Reset hard
r = c.post('/reset', json={'task_difficulty': 'hard'})
data = r.json()
hard_obs = data['observation']
print(f'[6] POST /reset hard: {r.status_code} -> task_id={hard_obs["task_id"]}, steps_remaining={hard_obs["steps_remaining"]}')

# 7. Full easy episode
r = c.post('/reset', json={'task_difficulty': 'easy'})
obs = r.json()['observation']
task_id = obs['task_id']
bug_line = None
for d in obs['diffs']:
    if d['changed_line_numbers']:
        bug_line = d['changed_line_numbers'][0]
        break

if bug_line:
    c.post('/step', json={'action': {'action_type': 'add_comment', 'line_number': bug_line, 'content': 'off by one bug here wrong logic'}})
    c.post('/step', json={'action': {'action_type': 'classify_bug', 'line_number': bug_line, 'content': 'critical'}})
    r3 = c.post('/step', json={'action': {'action_type': 'request_changes', 'line_number': None, 'content': 'Critical bug must be fixed before merge'}})
    final = r3.json()
    print(f'[7] Full easy episode: task={task_id}, final_reward={final["reward"]:.4f}, done={final["done"]}')
    state_r = c.get('/state')
    s = state_r.json()
    print(f'    total_reward={s["total_reward"]:.4f}, verdict={s["verdict"]}')

print()
print('ALL HTTP TESTS PASSED')
c.close()
